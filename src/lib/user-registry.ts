import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  type Timestamp,
} from "firebase/firestore";
import type { User } from "firebase/auth";
import type { OAuthProviderId } from "@/lib/oauth";
import { db } from "@/integrations/firebase/client";

export type RegistryAuthMethod = "email" | OAuthProviderId;

export type RegistryUser = {
  email: string;
  authMethod: RegistryAuthMethod;
  registeredAt: number;
  lastLoginAt: number;
};

type AppUserDocument = {
  email: string;
  authMethod: RegistryAuthMethod;
  registeredAt: number | Timestamp;
  lastLoginAt: number | Timestamp;
};

const USERS_COLLECTION = "app_users";

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function timestampToMillis(value: number | Timestamp): number {
  return typeof value === "number" ? value : value.toMillis();
}

function toRegistryUser(data: AppUserDocument): RegistryUser {
  return {
    email: data.email,
    authMethod:
      data.authMethod === "google" || data.authMethod === "github"
        ? data.authMethod
        : "email",
    registeredAt: timestampToMillis(data.registeredAt),
    lastLoginAt: timestampToMillis(data.lastLoginAt),
  };
}

export async function syncUserToRegistry(
  user: User,
  authMethod: RegistryAuthMethod,
): Promise<boolean> {
  if (!user.email) return false;

  try {
    const userRef = doc(db, USERS_COLLECTION, user.uid);
    const existing = await getDoc(userRef);
    const registeredAt =
      existing.exists() && existing.data().registeredAt
        ? existing.data().registeredAt
        : serverTimestamp();

    await setDoc(
      userRef,
      {
        email: user.email,
        authMethod,
        registeredAt,
        lastLoginAt: serverTimestamp(),
      },
      { merge: true },
    );
    return true;
  } catch (error) {
    console.warn("[user-registry] No se pudo sincronizar usuario con Firestore:", error);
    return false;
  }
}

export async function loadAllRegistryUsers(): Promise<RegistryUser[]> {
  const usersQuery = query(
    collection(db, USERS_COLLECTION),
    orderBy("lastLoginAt", "desc"),
  );
  const snapshot = await getDocs(usersQuery);
  return snapshot.docs.map((userDoc) =>
    toRegistryUser(userDoc.data() as AppUserDocument),
  );
}

export async function removeUserFromRegistry(email: string): Promise<boolean> {
  try {
    const snapshot = await getDocs(collection(db, USERS_COLLECTION));
    const normalizedEmail = normalizeEmail(email);
    const matchingUsers = snapshot.docs.filter(
      (userDoc) =>
        typeof userDoc.data().email === "string" &&
        normalizeEmail(userDoc.data().email) === normalizedEmail,
    );
    await Promise.all(matchingUsers.map((userDoc) => deleteDoc(userDoc.ref)));
    return true;
  } catch (error) {
    console.error("[user-registry] No se pudo eliminar usuario de Firestore:", error);
    return false;
  }
}

export function isRegistryAvailable(): boolean {
  return true;
}
