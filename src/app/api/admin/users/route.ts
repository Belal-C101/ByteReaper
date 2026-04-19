import { NextRequest, NextResponse } from "next/server";
import { verifyFirebaseIdToken, adminAuth, adminDb } from "@/lib/firebase/admin";
import { isAdminEmail } from "@/lib/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function requireAdmin(req: NextRequest) {
  const authHeader = req.headers.get("authorization") || "";
  const token = await verifyFirebaseIdToken(authHeader.replace(/^Bearer\s+/i, ""));
  if (!token || !isAdminEmail(token.email || "")) {
    return null;
  }
  return token;
}

// GET — list all users from Firebase Auth
export async function GET(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const pageToken = req.nextUrl.searchParams.get("pageToken") || undefined;

  try {
    const listResult = await adminAuth.listUsers(100, pageToken);
    const users = listResult.users.map((u) => ({
      uid: u.uid,
      email: u.email || "",
      displayName: u.displayName || "",
      photoURL: u.photoURL || "",
      emailVerified: u.emailVerified,
      disabled: u.disabled,
      createdAt: u.metadata.creationTime || "",
      lastSignIn: u.metadata.lastSignInTime || "",
      providerData: u.providerData.map((p) => ({
        providerId: p.providerId,
        email: p.email,
      })),
    }));

    return NextResponse.json({
      users,
      nextPageToken: listResult.pageToken || null,
    });
  } catch (err) {
    console.error("[api/admin/users] GET error", err);
    return NextResponse.json({ error: "Failed to list users" }, { status: 500 });
  }
}

// PATCH — update user properties
export async function PATCH(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json().catch(() => null);
  if (!body?.uid) {
    return NextResponse.json({ error: "uid required" }, { status: 400 });
  }

  const { uid, action, ...updates } = body;

  try {
    switch (action) {
      case "updateProfile": {
        const updatePayload: Record<string, string> = {};
        if (typeof updates.displayName === "string") updatePayload.displayName = updates.displayName;
        if (typeof updates.photoURL === "string") updatePayload.photoURL = updates.photoURL;
        if (Object.keys(updatePayload).length === 0) {
          return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
        }
        await adminAuth.updateUser(uid, updatePayload);

        // Also update user_profiles if it exists (query by uid)
        const profileSnap = await adminDb.collection("user_profiles").where("uid", "==", uid).limit(1).get();
        if (!profileSnap.empty) {
          await profileSnap.docs[0].ref.update(updatePayload);
        }

        return NextResponse.json({ success: true });
      }

      case "resetPassword": {
        const userRecord = await adminAuth.getUser(uid);
        if (!userRecord.email) {
          return NextResponse.json({ error: "User has no email" }, { status: 400 });
        }
        // Generate password reset link
        const link = await adminAuth.generatePasswordResetLink(userRecord.email);
        return NextResponse.json({ success: true, link });
      }

      case "changeEmail": {
        if (!updates.newEmail || typeof updates.newEmail !== "string") {
          return NextResponse.json({ error: "newEmail required" }, { status: 400 });
        }
        const userForEmail = await adminAuth.getUser(uid);
        if (!userForEmail.email) {
          return NextResponse.json({ error: "User has no current email" }, { status: 400 });
        }
        // Generate email change verification link
        const emailLink = await adminAuth.generateVerifyAndChangeEmailLink(
          userForEmail.email,
          updates.newEmail
        );
        return NextResponse.json({ success: true, link: emailLink });
      }

      case "disableUser": {
        await adminAuth.updateUser(uid, { disabled: true });
        return NextResponse.json({ success: true });
      }

      case "enableUser": {
        await adminAuth.updateUser(uid, { disabled: false });
        return NextResponse.json({ success: true });
      }

      default:
        return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }
  } catch (err) {
    console.error("[api/admin/users] PATCH error", err);
    const message = err instanceof Error ? err.message : "Operation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// DELETE — delete a user account
export async function DELETE(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json().catch(() => null);
  if (!body?.uid) {
    return NextResponse.json({ error: "uid required" }, { status: 400 });
  }

  // Prevent admin from deleting themselves
  if (body.uid === admin.uid) {
    return NextResponse.json({ error: "Cannot delete your own account" }, { status: 400 });
  }

  try {
    // Delete from Firebase Auth
    await adminAuth.deleteUser(body.uid);

    // Clean up Firestore user_profiles (query by uid)
    const profileSnap = await adminDb.collection("user_profiles").where("uid", "==", body.uid).limit(1).get();
    if (!profileSnap.empty) {
      const profileData = profileSnap.docs[0].data();
      await profileSnap.docs[0].ref.delete();

      // Delete username reservation if exists
      if (profileData.usernameLower) {
        await adminDb.collection("usernames").doc(profileData.usernameLower).delete().catch(() => {});
      }
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[api/admin/users] DELETE error", err);
    const message = err instanceof Error ? err.message : "Delete failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
