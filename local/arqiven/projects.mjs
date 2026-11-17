/** Proyectos locales y permisos. No hay cuenta de orvupi.com: el usuario es de este equipo. */

import { codeError } from "./errors.mjs";

export const ROLES = ["owner", "editor", "reader"];

const ACTIONS = {
  read: ["owner", "editor", "reader"],
  write: ["owner", "editor"],
  rename: ["owner", "editor"],
  move: ["owner", "editor"],
  remove: ["owner"],
  members: ["owner"],
};

export function cleanUser(value) {
  const id = String(value || "").trim().slice(0, 64);
  return /^[A-Za-z0-9._-]{1,64}$/.test(id) ? id : "";
}

export function cleanName(value) {
  return String(value || "").replace(/\s+/g, " ").trim().slice(0, 80);
}

export function roleOf(members, projectId, userId) {
  return (Array.isArray(members) ? members : []).find((item) => item.projectId === projectId && item.userId === userId)?.role || "";
}

export function canAct(role, action) {
  return (ACTIONS[action] || []).includes(role);
}

export function canSeeChat(data, chat, userId) {
  if (!chat) return false;
  if (chat.projectId) return canAct(roleOf(data.members, chat.projectId, userId), "read");
  return chat.ownerId === userId;
}

export function canWriteChat(data, chat, userId) {
  if (!chat) return false;
  if (chat.projectId) return canAct(roleOf(data.members, chat.projectId, userId), "write");
  return chat.ownerId === userId;
}

function requireRole(data, projectId, userId, action) {
  const role = roleOf(data.members, projectId, userId);
  if (!canAct(role, action)) throw codeError("forbidden");
  return role;
}

export function createProject(data, input) {
  const name = cleanName(input.name);
  const userId = cleanUser(input.userId);
  const id = String(input.id || "");
  if (!name || !userId || !/^[A-Za-z0-9-]{8,80}$/.test(id)) throw codeError("bad-request");
  if (data.projects.some((item) => item.id === id)) throw codeError("bad-request");
  const now = new Date().toISOString();
  const project = { id, name, created: now, updated: now };
  data.projects.push(project);
  data.members.push({ projectId: id, userId, role: "owner" });
  return { ...project, role: "owner" };
}

export function renameProject(data, input) {
  const name = cleanName(input.name);
  if (!name) throw codeError("bad-request");
  requireRole(data, input.projectId, input.userId, "rename");
  const project = data.projects.find((item) => item.id === input.projectId);
  if (!project) throw codeError("bad-request");
  project.name = name;
  project.updated = new Date().toISOString();
  return { ...project, role: roleOf(data.members, project.id, input.userId) };
}

export function removeProject(data, input) {
  requireRole(data, input.projectId, input.userId, "remove");
  const index = data.projects.findIndex((item) => item.id === input.projectId);
  if (index < 0) throw codeError("bad-request");
  data.projects.splice(index, 1);
  data.members = data.members.filter((item) => item.projectId !== input.projectId);
  for (const chat of data.conversations) {
    if (chat.projectId === input.projectId) chat.projectId = "";
  }
  return { id: input.projectId, removed: true };
}

export function setMember(data, input) {
  requireRole(data, input.projectId, input.userId, "members");
  const project = data.projects.find((item) => item.id === input.projectId);
  const memberId = cleanUser(input.memberId);
  if (!project || !memberId) throw codeError("bad-request");
  const role = input.role === "" || input.role == null ? "" : input.role;
  if (role && !ROLES.includes(role)) throw codeError("bad-request");
  const others = data.members.filter((item) => !(item.projectId === input.projectId && item.userId === memberId));
  const next = role ? others.concat([{ projectId: input.projectId, userId: memberId, role }]) : others;
  const owners = next.filter((item) => item.projectId === input.projectId && item.role === "owner");
  if (!owners.length) throw codeError("bad-request");
  data.members = next;
  return { projectId: input.projectId, userId: memberId, role };
}

export function renameChat(data, input) {
  const chat = data.conversations.find((item) => item.id === input.conversationId);
  if (!chat || !canWriteChat(data, chat, input.userId)) throw codeError("forbidden");
  const title = cleanName(input.title);
  if (!title) throw codeError("bad-request");
  chat.title = title;
  chat.renamed = true;
  chat.updated = new Date().toISOString();
  return { id: chat.id, title, projectId: chat.projectId || "" };
}

export function moveChat(data, input) {
  const chat = data.conversations.find((item) => item.id === input.conversationId);
  if (!chat || !canWriteChat(data, chat, input.userId)) throw codeError("forbidden");
  const projectId = String(input.projectId || "");
  if (projectId) {
    if (!data.projects.some((item) => item.id === projectId)) throw codeError("bad-request");
    requireRole(data, projectId, input.userId, "move");
  }
  chat.projectId = projectId;
  chat.updated = new Date().toISOString();
  return { id: chat.id, projectId, title: chat.title };
}
