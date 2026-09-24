"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import {
  checkCredentials,
  clearFailures,
  configReady,
  createSession,
  destroySession,
  recordFailure,
  tooManyAttempts,
  usersLoaded,
} from "./_lib/auth";

export type LoginState = { error?: string; username?: string } | undefined;

export async function login(_prev: LoginState, formData: FormData): Promise<LoginState> {
  if (!configReady()) {
    return { error: "El portal aún no está configurado. Contacta a Pro-DG." };
  }

  const username = String(formData.get("username") ?? "").slice(0, 64);
  // Trim: a space copied along with the password is a common mistake.
  const password = String(formData.get("password") ?? "").trim().slice(0, 256);
  const h = await headers();
  const ip = (h.get("x-forwarded-for") ?? "").split(",")[0].trim() || "unknown";
  const key = `${ip}|${username.toLowerCase()}`;

  if (tooManyAttempts(key)) {
    return { error: "Demasiados intentos. Espera 15 minutos e inténtalo de nuevo.", username };
  }
  if (!usersLoaded()) {
    return {
      error: "No se pudo leer la lista de usuarios (PORTAL_USERS). Revisa esa variable en Vercel y vuelve a publicar.",
      username,
    };
  }
  if (!username || !password) {
    return { error: "Escribe tu usuario y contraseña.", username };
  }

  const user = checkCredentials(username, password);
  if (!user) {
    recordFailure(key);
    return { error: "Usuario o contraseña incorrectos.", username };
  }

  clearFailures(key);
  await createSession(user.u);
  redirect("/agentes");
}

export async function logout() {
  await destroySession();
  redirect("/agentes/login");
}
