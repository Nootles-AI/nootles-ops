import { clerkMiddleware } from "@clerk/nextjs/server";

/**
 * Next 16's middleware convention. Everything is private: this is the
 * operator's dashboard, and Clerk's hosted sign-in handles the round trip.
 * Authorization (is this THE operator) happens in Convex, per query.
 */
export default clerkMiddleware(async (auth) => {
  await auth.protect();
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|webmanifest)).*)",
  ],
};
