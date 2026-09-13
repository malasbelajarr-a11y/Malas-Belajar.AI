import crypto from "node:crypto";
import { supabaseConfigured, supabaseRequest } from "./supabase";

export type StudentLevel = "nguli" | "mandor" | "supervisor";

export interface StoredStudent {
  id: string;
  name: string;
  email: string;
  level: StudentLevel;
  active: boolean;
  password_hash: string;
  used_access_codes: string[];
}

const KIND = "student_registry";

function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

function verifyPassword(password: string, stored: string): boolean {
  const [salt, storedHash] = String(stored || "").split(":");
  if (!salt || !storedHash) return false;
  const derived = crypto.scryptSync(password, salt, 64).toString("hex");
  const a = Buffer.from(derived, "hex");
  const b = Buffer.from(storedHash, "hex");
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function parseRow(row: any): StoredStudent | null {
  try {
    const data = typeof row?.description === "string" ? JSON.parse(row.description) : row?.data;
    if (!data?.email || !data?.password_hash) return null;
    return {
      id: String(data.id || row.id),
      name: String(data.name || row.title || ""),
      email: String(data.email).toLowerCase(),
      level: data.level as StudentLevel,
      active: data.active !== false,
      password_hash: String(data.password_hash),
      used_access_codes: Array.isArray(data.used_access_codes) ? data.used_access_codes.map(String) : [],
    };
  } catch {
    return null;
  }
}

const memoryStudents = new Map<string, StoredStudent>();

export function publicStudent(student: StoredStudent) {
  return {
    id: student.id,
    name: student.name,
    email: student.email,
    level: student.level,
    active: student.active,
  };
}

export function passwordMatches(student: StoredStudent, password: string) {
  return verifyPassword(password, student.password_hash);
}

export async function listStudents(): Promise<StoredStudent[]> {
  if (!supabaseConfigured()) return Array.from(memoryStudents.values());
  try {
    const rows = await supabaseRequest<any[]>(`${"wacawaci_resources"}?kind=eq.${KIND}&select=*`);
    const students = rows.map(parseRow).filter(Boolean) as StoredStudent[];
    for (const student of students) memoryStudents.set(student.email, student);
    return students;
  } catch (error) {
    console.error("STUDENT_LIST_ERROR", error);
    return Array.from(memoryStudents.values());
  }
}

export async function findStudent(email: string): Promise<StoredStudent | null> {
  const cleanEmail = String(email || "").trim().toLowerCase();
  const local = memoryStudents.get(cleanEmail);
  if (local) return local;
  const students = await listStudents();
  return students.find((student) => student.email === cleanEmail) || null;
}

export async function saveStudent(input: {
  name: string;
  email: string;
  level: StudentLevel;
  password: string;
  accessCode: string;
}): Promise<StoredStudent> {
  const student: StoredStudent = {
    id: `student-${Date.now()}-${crypto.randomBytes(4).toString("hex")}`,
    name: input.name,
    email: input.email.toLowerCase(),
    level: input.level,
    active: true,
    password_hash: hashPassword(input.password),
    used_access_codes: [input.accessCode.toUpperCase()],
  };
  memoryStudents.set(student.email, student);

  if (supabaseConfigured()) {
    await supabaseRequest("wacawaci_resources", {
      method: "POST",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({
        id: student.id,
        kind: KIND,
        title: student.name,
        description: JSON.stringify(student),
        url: "",
        is_public: true,
        created_by: "student-auth",
        level: student.level,
      }),
    });
  }
  return student;
}

export async function accessCodeAlreadyUsed(code: string): Promise<boolean> {
  const normalized = String(code || "").trim().toUpperCase();
  if (!normalized) return false;
  const students = await listStudents();
  return students.some((student) => student.used_access_codes.includes(normalized));
}

export async function markAccessCodeUsed(student: StoredStudent, code: string, newLevel?: StudentLevel): Promise<StoredStudent> {
  const normalized = String(code || "").trim().toUpperCase();
  const updated: StoredStudent = {
    ...student,
    level: newLevel || student.level,
    used_access_codes: Array.from(new Set([...student.used_access_codes, normalized])),
  };
  memoryStudents.set(updated.email, updated);

  if (supabaseConfigured()) {
    const payload = JSON.stringify(updated);
    await supabaseRequest(`wacawaci_resources?id=eq.${encodeURIComponent(updated.id)}&kind=eq.${KIND}`, {
      method: "PATCH",
      body: JSON.stringify({ description: payload, level: updated.level, title: updated.name }),
    });
  }
  return updated;
}

export async function setStudentActive(student: StoredStudent, active: boolean): Promise<StoredStudent> {
  const updated = { ...student, active };
  memoryStudents.set(updated.email, updated);
  if (supabaseConfigured()) {
    await supabaseRequest(`wacawaci_resources?id=eq.${encodeURIComponent(updated.id)}&kind=eq.${KIND}`, {
      method: "PATCH",
      body: JSON.stringify({ description: JSON.stringify(updated) }),
    });
  }
  return updated;
}
