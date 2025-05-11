import { OAuth2Client } from "google-auth-library";
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

export const verify = async (token) => {
  const ticket = await client.verifyIdToken({
    idToken: token,
    audience: process.env.GOOGLE_CLIENT_ID,
  });
  const payload = ticket.getPayload();
  const userId = payload["sub"];

  return {
    id: userId,
    email: payload.email,
    name: payload.name,
    picture: payload.picture,
  };
  
};
