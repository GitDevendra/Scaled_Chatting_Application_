const { Kafka, Partitioners } = require('kafkajs');

const kafka = new Kafka({
  clientId: process.env.KAFKA_CLIENT_ID,
  brokers: process.env.KAFKA_BROKERS.split(','),
  retry: {
    initialRetryTime: 300,
    retries: 8,
  },
});

const producer = kafka.producer({
  createPartitioner: Partitioners.LegacyPartitioner,
  allowAutoTopicCreation: true,
});

const consumer = kafka.consumer({
  groupId: process.env.KAFKA_GROUP_ID,
});

const connectKafka = async () => {
  await producer.connect();
  console.log('✅ Kafka producer connected');

  await consumer.connect();
  console.log('✅ Kafka consumer connected');
};

const publishEvent = async (topic, key, value) => {
  await producer.send({
    topic,
    messages: [
      {
        key: String(key),                     
        value: JSON.stringify(value),
        timestamp: Date.now().toString(),
      },
    ],
  });
};

module.exports = { kafka, producer, consumer, connectKafka, publishEvent };