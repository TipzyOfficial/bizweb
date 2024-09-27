import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import '../node_modules/bootstrap/dist/css/bootstrap.min.css'
import App, { goToBar, goToLogin } from './App';
import { clearData, getCookies, getStored, setStored } from './lib/utils';
import reportWebVitals from './reportWebVitals';
import { GoogleOAuthProvider, googleLogout } from '@react-oauth/google';
import { TokenReturnType, getUser } from './lib/serverinfo';
import { Business, DefaultUser, Users } from './lib/user';
import Cookies from 'universal-cookie';
import { fetchWithToken as sharedFetchWithToken } from './lib/serverinfo';
import { useCookies } from 'react-cookie';
import { UserSessionContextType, defaultConsumer } from './lib/UserSessionContext';

const cookies = getCookies();

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

console.log(!process.env.REACT_APP_GAUTH_CLIENT_ID ? "No Gauth client id detected." : "Gauth client id detected.")

root.render(
  <React.StrictMode>
    <GoogleOAuthProvider clientId={process.env.REACT_APP_GAUTH_CLIENT_ID ?? ""}>
      <App />
    </GoogleOAuthProvider>
  </React.StrictMode>
);

export function Logout(usc: UserSessionContextType, data?: any, defaultToBar?: boolean) {
  usc.abortController?.abort();
  usc.setUser(new Business(usc.user.user));

  clearData();
  googleLogout();
  console.log("going to login")
  goToLogin(data, defaultToBar ?? false);
}

export function rootGetRefreshToken(): string | null {
  const rt = getStored("refresh_token");
  return rt;
}


/**
 * updates the tokens in local storage
 * @param user the user session
 * @param tokens the new tokens
 * @param cookies the cookies that are storing the token data
 * @param setUser (optional) update the user if using useState()
 */
async function resetTokenValues(usc: UserSessionContextType, tokens: TokenReturnType) {
  // console.log("resetting tokens to!", tokens)
  const access = getStored("access_token");
  const refresh = getStored("refresh_token");
  const expa = getStored("expires_at");
  if (!refresh || !access || !expa) return;

  await storeTokens(tokens.access_token, tokens.refresh_token, tokens.expires_at)

  // await cookies.set("expires_at", tokens.refresh_token, { path: '/' });
  const newUser = structuredClone(usc.user);
  newUser.user.access_token = tokens.access_token;
  newUser.user.expires_at = tokens.expires_at

  usc.setUser(newUser);
}

export async function getBusiness(usc: UserSessionContextType) {
  return getUser("business", usc.user.user.access_token, usc.user.user.expires_at, () => rootGetRefreshToken(), () => Logout(usc), (tokens: TokenReturnType) => resetTokenValues(usc, tokens));
}

export const businessFromJSON = (user: Business | undefined, d: any) => {
  console.log("bdata", d);

  const u = user?.user ?? new Users("", 0, "");

  const c = new Business(new Users(u.access_token, u.expires_at, `${d.user_info.first_name} ${d.user_info.last_name}`, u.image, d.user_info.email),
    d.business_name,
    d.business_image,
    d.id,
    d.allowing_requests,
    d.auto_accept_requests,
    d.type,
    d.address,
    d.vibe,
    d.block_explicit,
    d.hour_explicit_allowed,
    d.hour_explicit_blocked,
    d.gpt_accept_requests,
    d.dj_mode,
  )
  return (c);
}

export async function checkIfAccountExists(usc: UserSessionContextType): Promise<{ result: boolean, data: Business }> {
  return getBusiness(usc).then(json => {
    const d = json.data;
    return {
      result: json.status === 200,
      data: json.status !== 200 ? usc.user : businessFromJSON(usc.user, d)
    }
  })
    .catch(e => { throw e })
}

async function handleResponse(response: Response | null) {
  if (response === null) throw new Error("Null response.");
  if (!response.ok) {
    const t = await response.text()
    throw new Error(`Bad response. Code: ${response.status}. ${t}`);
  }
  return response;
}

export async function fetchWithToken(usc: UserSessionContextType, urlEnding: string, fetchMethod: string, body?: string, data?: any) {
  const response = await sharedFetchWithToken(usc.user.user.access_token, urlEnding, usc.user.user.expires_at, () => rootGetRefreshToken(), () => Logout(usc, data), (tokens: TokenReturnType) => resetTokenValues(usc, tokens), fetchMethod, body, usc.abortController?.signal).then(response => {
    return handleResponse(response);
  }).catch((e: Error) => {
    if (e.name === "AbortError") {
      console.log("fetch aborted" + e);
    }
    throw new Error("error at " + urlEnding + " " + e.message);
  });
  return response;
}

export async function storeTokens(accessToken: string, refreshToken: string, expiresAt: number) {
  console.log("storing tokens");

  // cookies.set("access_token", accessToken, { expires: new Date(expiresAt), secure: true });
  // cookies.set("refresh_token", refreshToken, { expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), secure: true });
  // cookies.set("expires_at", expiresAt, { expires: new Date(expiresAt), secure: true });

  setStored("access_token", accessToken);
  setStored("refresh_token", refreshToken);
  setStored("expires_at", expiresAt.toString());
}

export async function storeAll(usc: UserSessionContextType, refreshToken: string) {
  await storeTokens(usc.user.user.access_token, refreshToken, usc.user.user.expires_at);
  const json = await getBusiness(usc);

  return businessFromJSON(usc.user, json.data);
}

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
