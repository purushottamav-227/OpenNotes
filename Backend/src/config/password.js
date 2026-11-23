import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { Strategy as GitHubStrategy } from "passport-github2";

import env from "./env.js";

/*
|--------------------------------------------------------------------------
| GOOGLE OAUTH STRATEGY
|--------------------------------------------------------------------------
*/

if (env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET) {
  passport.use(
    "google",
    new GoogleStrategy(
      {
        clientID: env.GOOGLE_CLIENT_ID,
        clientSecret: env.GOOGLE_CLIENT_SECRET,
        callbackURL: env.GOOGLE_CALLBACK_URL,
        scope: ["profile", "email"],
        state: true
      },
      (accessToken, refreshToken, profile, done) => {
        try {
          const googleData = profile._json ?? {};

          const email = profile.emails?.find(
            (entry) => entry.verified === true
          )?.value;

          const emailVerified = googleData.email_verified === true;

          if (!profile.id || !email || !emailVerified) {
            return done(null, false, {
              message:
                "A verified Google email address is required to sign in."
            });
          }

          return done(null, {
            provider: "google",
            providerUserId: profile.id,
            name: profile.displayName?.trim() || "",
            email: email.trim().toLowerCase(),
            emailVerified: true
          });
        } catch (error) {
          return done(error);
        }
      }
    )
  );
} else {
  console.warn(
    "Google OAuth is disabled because its client credentials are not configured."
  );
}

/*
|--------------------------------------------------------------------------
| GITHUB OAUTH STRATEGY
|--------------------------------------------------------------------------
*/

if (env.GITHUB_CLIENT_ID && env.GITHUB_CLIENT_SECRET) {
  passport.use(
    "github",
    new GitHubStrategy(
      {
        clientID: env.GITHUB_CLIENT_ID,
        clientSecret: env.GITHUB_CLIENT_SECRET,
        callbackURL: env.GITHUB_CALLBACK_URL,
        scope: ["read:user", "user:email"],
        state: true
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          if (!profile.id) {
            return done(null, false, {
              message: "Unable to identify your GitHub account."
            });
          }

          /*
           * GitHub's profile email may be missing or unverified.
           * Query its authenticated email endpoint instead.
           */
          const response = await fetch(
            "https://api.github.com/user/emails",
            {
              method: "GET",
              headers: {
                Authorization: `Bearer ${accessToken}`,
                Accept: "application/vnd.github+json",
                "X-GitHub-Api-Version": "2022-11-28",
                "User-Agent": "OpenNotes"
              },
              signal: AbortSignal.timeout(10000)
            }
          );

          if (!response.ok) {
            return done(
              new Error(
                "Unable to verify the email address associated with GitHub."
              )
            );
          }

          const emails = await response.json();

          if (!Array.isArray(emails)) {
            return done(
              new Error("GitHub returned an invalid email response.")
            );
          }

          const verifiedEmail = emails.find(
            (entry) =>
              entry.verified === true && entry.primary === true
          );

          if (!verifiedEmail?.email) {
            return done(null, false, {
              message:
                "A verified primary GitHub email address is required."
            });
          }

          return done(null, {
            provider: "github",
            providerUserId: String(profile.id),
            name:
              profile.displayName?.trim() ||
              profile.username?.trim() ||
              "",
            email: verifiedEmail.email.trim().toLowerCase(),
            emailVerified: true
          });
        } catch (error) {
          return done(error);
        }
      }
    )
  );
} else {
  console.warn(
    "GitHub OAuth is disabled because its client credentials are not configured."
  );
}

export default passport;