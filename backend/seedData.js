import { adminDb } from "./firebaseAdmin.js";

const INITIAL_SUBJECTS = [
  { id: "sub_1", code: "PH3151", name: "Engineering Physics", tamil: "பொறியியல் இயற்பியல்", icon: "⚛️", assignedTeacher: "Unassigned" },
  { id: "sub_2", code: "HS3151", name: "English", tamil: "ஆங்கிலம்", icon: "📖", assignedTeacher: "Unassigned" },
  { id: "sub_3", code: "GE3151", name: "Python", tamil: "பைத்தான்", icon: "🐍", assignedTeacher: "Unassigned" },
  { id: "sub_4", code: "EC8701", name: "Wireless Communication", tamil: "வயர்லெஸ் தொடர்பு", icon: "📡", assignedTeacher: "Unassigned" },
  { id: "sub_5", code: "EC8702", name: "Analog IC Design", tamil: "அனலாக் IC டிசைன்", icon: "🔌", assignedTeacher: "Unassigned" },
  { id: "sub_6", code: "EC8751", name: "4G & 5G Cellular Tech", tamil: "4G & 5G Cellular Tech", icon: "📶", assignedTeacher: "Unassigned" },
  { id: "sub_7", code: "GE3451", name: "Environmental Science", tamil: "சுற்றுச்சூழல் அறிவியல்", icon: "🌱", assignedTeacher: "Unassigned" },
  { id: "sub_8", code: "CS8591", name: "Computer Networks", tamil: "கணினி வலைப்பின்னல்கள்", icon: "🌐", assignedTeacher: "Unassigned" },
  { id: "sub_9", code: "EC8553", name: "Digital Signal Processing", tamil: "டிஜிட்டல் சிக்னல் பிராசஸிங்", icon: "〽️", assignedTeacher: "Unassigned" },
];

async function seedDatabase() {
  console.log("🌱 Starting Database Seeding...");
  try {
    for (const sub of INITIAL_SUBJECTS) {
      await adminDb.collection("subjects").doc(sub.id).set(sub, { merge: true });
      console.log(`✅ Seeded subject: ${sub.name}`);
    }
    console.log("🎉 Database seeding completed successfully!");
  } catch (err) {
    console.error("❌ Seeding failed:", err.message);
  }
}

seedDatabase();
