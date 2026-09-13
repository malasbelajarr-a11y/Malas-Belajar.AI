import { listStudents, publicStudent, setStudentActive } from "../_lib/studentStore";

export default async function handler(req: any, res: any) {
  try {
    if (req.method === "GET") {
      const students = await listStudents();
      return res.json(students.map(publicStudent));
    }
    if (req.method === "PATCH") {
      const id = String(req.query.id || "");
      const students = await listStudents();
      const student = students.find((item) => item.id === id);
      if (!student) return res.status(404).json({ detail: "Siswa tidak ditemukan." });
      const updated = await setStudentActive(student, Boolean(req.body?.active));
      return res.json(publicStudent(updated));
    }
    return res.status(405).json({ detail: "Method not allowed" });
  } catch (error) {
    console.error("ADMIN_STUDENTS_ERROR", error);
    return res.status(500).json({ detail: "Gagal memuat data siswa." });
  }
}
