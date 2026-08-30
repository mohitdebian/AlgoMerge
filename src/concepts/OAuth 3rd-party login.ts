// OAuth / 3rd-party login
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';

passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID!,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
  callbackURL: '/auth/google/callback'
}, (accessToken, refreshToken, profile, done) => {
  // Find or create user from OAuth profile
  const user = { id: profile.id, name: profile.displayName, email: profile.emails?.[0]?.value };
  done(null, user);
}));

passport.serializeUser((user: any, done) => done(null, user.id));
passport.deserializeUser((id, done) => done(null, { id }));

export { passport };
