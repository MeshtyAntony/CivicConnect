
require('dotenv').config();
const { MongoClient } = require('mongodb');

const uri = process.env.MONGODB_URI;
const dbName = process.env.DB_NAME || 'civicconnect';

const demoReports = [
  {
    demoSeed: 'civicconnect-demo-road-1',
    authorName: 'Arun Kumar',
    title: 'Dangerous potholes near the bus stop',
    description:
      'Several deep potholes have formed along this busy road near the bus stop. Two-wheelers are swerving into traffic to avoid them, especially during the evening rush. The damaged section needs urgent repairs to prevent accidents.',
    category: 'roads',
    priority: 'high',
    location: 'Gandhipuram, Coimbatore',
    status: 'IN PROGRESS',
    photo: 'https://images.unsplash.com/photo-1519608487953-e999c86e7455?w=1000&auto=format&fit=crop',
    supportCount: 24,
    supporters: [],
    comments: [
      'This road has been in bad condition for weeks.',
      'The potholes are difficult to see at night.',
      'Hope the repair work starts soon.',
    ],
    createdAt: new Date('2026-10-06T08:30:00+05:30'),
  },
  {
    demoSeed: 'civicconnect-demo-light-1',
    authorName: 'Priya Raj',
    title: 'Streetlight not working on our road',
    description:
      'The streetlight near our residential lane has not been working for several days. The road becomes very dark after sunset, making it uncomfortable for pedestrians and residents returning home late. Please arrange an inspection and repair.',
    category: 'streetlights',
    priority: 'medium',
    location: 'Peelamedu, Coimbatore',
    status: 'PENDING',
    photo: 'https://images.unsplash.com/photo-1519501025264-65ba15a82390?w=1000&auto=format&fit=crop',
    supportCount: 17,
    supporters: [],
    comments: [
      'The entire stretch is dark after 7 PM.',
      'Several residents use this road every day.',
    ],
    createdAt: new Date('2026-10-07T17:15:00+05:30'),
  },
  {
    demoSeed: 'civicconnect-demo-garbage-1',
    authorName: 'Karthik S',
    title: 'Garbage piling up near the market',
    description:
      'Waste has been accumulating near the market entrance, and it is not being cleared regularly. The growing pile creates an unpleasant smell and makes the walkway difficult to use. A regular collection schedule would help keep this public area clean.',
    category: 'garbage',
    priority: 'medium',
    location: 'Town Hall, Coimbatore',
    status: 'RESOLVED',
    photo: 'https://images.unsplash.com/photo-1605600659873-d808a13e4d9a?w=1000&auto=format&fit=crop',
    supportCount: 31,
    supporters: [],
    comments: [
      'The smell was getting worse every morning.',
      'Thank you for clearing the waste.',
      'Regular collection would prevent this from happening again.',
    ],
    createdAt: new Date('2026-10-04T09:00:00+05:30'),
  },
  {
    demoSeed: 'civicconnect-demo-water-1',
    authorName: 'Meena Devi',
    title: 'Irregular water supply in our neighbourhood',
    description:
      'Families in our street have been receiving water at inconsistent times, making it difficult to plan everyday activities. Residents would benefit from a reliable supply schedule and an update from the relevant public utility department.',
    category: 'water',
    priority: 'high',
    location: 'Saravanampatti, Coimbatore',
    status: 'PENDING',
    photo: 'https://images.unsplash.com/photo-1548839140-29a749e1cf4d?w=1000&auto=format&fit=crop',
    supportCount: 19,
    supporters: [],
    comments: [
      'We have been facing this issue for several days.',
      'A clear water supply schedule would help everyone.',
    ],
    createdAt: new Date('2026-10-08T07:45:00+05:30'),
  },
  {
    demoSeed: 'civicconnect-demo-drain-1',
    authorName: 'Vignesh R',
    title: 'Blocked roadside drainage after rain',
    description:
      'Rainwater is draining very slowly near the junction, and water is collecting along the roadside. The drain may be blocked by accumulated waste. Please inspect and clean the drainage line before further rainfall causes more disruption.',
    category: 'drainage',
    priority: 'critical',
    location: 'RS Puram, Coimbatore',
    status: 'IN PROGRESS',
    photo: 'https://images.unsplash.com/photo-1518837695005-2083093ee35b?w=1000&auto=format&fit=crop',
    supportCount: 28,
    supporters: [],
    comments: [
      'Water is collecting near the junction.',
      'Please clear the drain before the next rain.',
      'This needs attention as soon as possible.',
    ],
    createdAt: new Date('2026-10-05T14:20:00+05:30'),
  },
];

async function seedDemoData() {
  if (!uri) {
    throw new Error('MONGODB_URI is missing from backend/.env');
  }

  const client = new MongoClient(uri);

  try {
    await client.connect();
    const collection = client.db(dbName).collection('reports');

    for (const report of demoReports) {
      await collection.updateOne(
        { demoSeed: report.demoSeed },
        { $setOnInsert: report },
        { upsert: true }
      );
    }

    console.log(`Checked ${demoReports.length} demo reports.`);
    console.log('Demo data seeding complete.');
  } finally {
    await client.close();
  }
}

seedDemoData().catch((error) => {
  console.error('Demo data seeding failed:', error.message);
  process.exitCode = 1;
});
