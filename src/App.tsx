import './index.css';
// import './App.css'
import Login from './pages/Login';
import {
  createBrowserRouter,
  Outlet,
  RouterProvider,
} from 'react-router-dom';
import Bar from './pages/bar/Bar';
import { useContext } from 'react';
import { Navigate } from 'react-router'
// import { Cookies, useCookies } from 'react-cookie';
import Cookies from 'universal-cookie';
import { UserSessionContext, UserSessionContextProvider } from './lib/UserSessionContext';
import { Elements, PaymentElement, } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { fetchPaymentSheetParams } from './lib/stripe';
import { DisplayOrLoading } from './components/DisplayOrLoading';
import Account from './pages/profile/Account';
import About from './pages/profile/About';
import { NotFoundPage } from './pages/bar/NotFoundPage';
import { getCookies, getStored } from './lib/utils';

export const stripePromise = loadStripe(process.env.REACT_APP_STRIPE_KEY ?? "");

function Redirect() {
  const userContext = useContext(UserSessionContext)
  const cookies = getCookies();
  const session = cookies.get("bar_session");
  let loggedin = getStored("refresh_token") && getStored("expires_at") && userContext.user.user.access_token;

  //reset refresh expiry time
  // if (loggedin) cookies.set("refresh_token", cookies.get("refresh_token"), { expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) });

  return (
    (session ? <Navigate to={`/bar?id=${session}`}></Navigate> : <Navigate to='/code'></Navigate>)
  )
}

export const router = createBrowserRouter([{
  // element: <Layout/>,
  children:
    [{
      path: "/",
      Component: Redirect
    },
    {
      path: "/login",
      Component: Login
    },
    {
      path: "/bar",
      Component: Bar
    },
    {
      path: "/account",
      Component: Account
    },
    {
      path: "/contact-us",
      Component: About
    }
    ], errorElement: <NotFoundPage title="Oops!" body={"We can't seem to find that page. Are you sure you entered everything correctly?"} backPath={-1} />
}
], {});

function App() {
  return (
    <div className="App-body">
      <UserSessionContextProvider>
        <div className="App-body" style={{ width: '100%' }}>
          <RouterProvider
            router={router} />
        </div>
      </UserSessionContextProvider>
    </div>
  )
}

export function goToBar(id?: number) {
  router.navigate(`/bar${id ? `?id=${id}` : ""}`).then(() => {
    // window.location.replace("/");
  });
}

export function goToArtist(id?: number) {
  router.navigate(`/artist${id ? `?id=${id}` : ""}`).then(() => {
    // window.location.replace("/");
  });
}


export type ReturnLinkType = {
  url: string,
  data: any
}

export function goToLogin(data?: any, defaultToBar?: boolean) {

  if (defaultToBar) {
    localStorage.removeItem("ret")
  }

  else {
    const url = window.location.pathname;
    const returnLink: ReturnLinkType = {
      url: url,
      data: data,
    }

    localStorage.setItem("ret", btoa(JSON.stringify(returnLink)))
  }

  // window.location.replace(
  //   `${window.location.origin}/login?prev=${urlbtoa}`
  // )

  window.location.replace(
    `${window.location.origin}/login`//?prev=true`
  )

  // router.navigate(`/login?prev=${urlbtoa}`).then(() => {
  //   window.location.reload
  // });
}

export default App;
