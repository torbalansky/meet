import axios from 'axios';
import NProgress from 'nprogress';
import { mockData } from './mock-data';

export const extractLocations = (events) => {
    var extractLocations = events.map((event) => event.location);
    var locations = [...new Set(extractLocations)];
    return locations;
  };

  const removeQuery = () => {
    if (window.history.pushState && window.location.pathname) {
        var newurl =
            window.location.protocol +
            "//" +
            window.location.host +
            window.location.pathname;
        window.history.pushState("", "", newurl);
    } else {
        newurl = window.location.protocol + "//" + window.location.host;
        window.history.pushState("", "", newurl);
    }
};

export const checkToken = async (accessToken) => {
    const result = await fetch(
        `https://www.googleapis.com/oauth2/v1/tokeninfo?access_token=${accessToken}`
    ).then((res) => res.json()
    ).catch((error) => error.json());

    return result;
};

const getToken = async (code) => {
  try {
    const encodeCode = encodeURIComponent(code);
    const { access_token } = await fetch(
      'https://e5sy8fv74g.execute-api.eu-west-2.amazonaws.com/dev/api/token/' + encodeCode
    )
        .then((res) => {
            return res.json();
        })
        .catch((error) => error);

    access_token && localStorage.setItem("access_token", access_token);

    return access_token;
  } catch (error) {
    error.json();
  }
};

export const getEvents = async () => {
    NProgress.start();
    if (window.location.href.startsWith('http://localhost')) {
        NProgress.done();
        return mockData;
    }

    if (!navigator.onLine) {
        const data = localStorage.getItem("lastEvents");
        NProgress.done();
        return data ? JSON.parse(data).events : [];
    }

    const token = await getAccessToken();
    if (token) {
        removeQuery();
        const url = 'https://e5sy8fv74g.execute-api.eu-west-2.amazonaws.com/dev/api/get-events/' + token;
        const result = await axios.get(url);
        if (result.data) {
            var locations = extractLocations(result.data.events);
            localStorage.setItem("lastEvents", JSON.stringify(result.data));
            localStorage.setItem("locations", JSON.stringify(locations));
        }
        NProgress.done();
        return result.data.events;
    }
}

export const getAccessToken = async () => {
    const accessToken = localStorage.getItem("access_token");
    const tokenCheck = accessToken && (await checkToken(accessToken));

    if (!accessToken || tokenCheck.error) {
        await localStorage.removeItem("access_token");
        const searchParams = new URLSearchParams(window.location.search);
        const code = await searchParams.get("code");
        if (!code) {
            try {
                const results = await axios.get(
                    "https://e5sy8fv74g.execute-api.eu-west-2.amazonaws.com/dev/api/get-auth-url"
                );
                const { authUrl } = results.data;
                return (window.location.href = authUrl);
            } catch (error) {
                console.error('Error getting auth URL:', error);
                throw error;
            }
        }
        return code && getToken(code);
    }
    return accessToken;
}