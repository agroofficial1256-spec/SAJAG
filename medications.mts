import { getStore } from "@netlify/blobs";
import type { Config, Context } from "@netlify/functions";

const SESSION_COOKIE = "drift_medication_session";
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

type MedicationTask = {
  id: string;
  name: string;
  medicationTime: string;
  completed: boolean;
  createdAt: string;
};

function getOwnerId(request: Request, context: Context) {
  const currentId = context.cookies.get(SESSION_COOKIE);
  if (currentId && UUID_PATTERN.test(currentId)) return currentId;

  const ownerId = crypto.randomUUID();
  context.cookies.set({
    name: SESSION_COOKIE,
    value: ownerId,
    path: "/",
    httpOnly: true,
    secure: new URL(request.url).protocol === "https:",
    sameSite: "Lax",
    maxAge: 60 * 60 * 24 * 365,
  });
  return ownerId;
}

function sortTasks(tasks: MedicationTask[]) {
  return tasks.sort((first, second) =>
    first.medicationTime.localeCompare(second.medicationTime) || first.createdAt.localeCompare(second.createdAt),
  );
}

async function readTasks(ownerId: string) {
  const store = getStore({ name: "medication-task-lists", consistency: "strong" });
  const tasks = await store.get(ownerId, { type: "json" });
  return {
    store,
    tasks: Array.isArray(tasks) ? (tasks as MedicationTask[]) : [],
  };
}

export default async (request: Request, context: Context) => {
  const ownerId = getOwnerId(request, context);

  try {
    const { store, tasks } = await readTasks(ownerId);

    if (request.method === "GET") {
      return Response.json({ tasks: sortTasks(tasks) });
    }

    if (request.method === "POST") {
      const body = await request.json();
      const name = typeof body?.name === "string" ? body.name.trim() : "";
      const medicationTime = typeof body?.medicationTime === "string" ? body.medicationTime : "";

      if (!name || name.length > 80 || !TIME_PATTERN.test(medicationTime)) {
        return Response.json({ error: "Add a medication name and valid time." }, { status: 400 });
      }

      const task: MedicationTask = {
        id: crypto.randomUUID(),
        name,
        medicationTime,
        completed: false,
        createdAt: new Date().toISOString(),
      };
      await store.setJSON(ownerId, sortTasks([...tasks, task]));
      return Response.json({ task }, { status: 201 });
    }

    if (request.method === "PATCH") {
      const body = await request.json();
      const id = typeof body?.id === "string" ? body.id : "";
      const completed = body?.completed;
      const task = tasks.find((item) => item.id === id);

      if (!UUID_PATTERN.test(id) || typeof completed !== "boolean") {
        return Response.json({ error: "Invalid task update." }, { status: 400 });
      }
      if (!task) return Response.json({ error: "Task not found." }, { status: 404 });

      task.completed = completed;
      await store.setJSON(ownerId, tasks);
      return Response.json({ task });
    }

    if (request.method === "DELETE") {
      const body = await request.json();
      const id = typeof body?.id === "string" ? body.id : "";

      if (!UUID_PATTERN.test(id)) {
        return Response.json({ error: "Invalid task." }, { status: 400 });
      }
      if (!tasks.some((task) => task.id === id)) {
        return Response.json({ error: "Task not found." }, { status: 404 });
      }

      await store.setJSON(ownerId, tasks.filter((task) => task.id !== id));
      return Response.json({ id });
    }

    return Response.json({ error: "Method not allowed." }, { status: 405 });
  } catch (error) {
    console.error("Medication task request failed", error instanceof Error ? error.message : "Unknown error");
    return Response.json({ error: "Tasks are unavailable right now." }, { status: 500 });
  }
};

export const config: Config = {
  path: "/api/medications",
};