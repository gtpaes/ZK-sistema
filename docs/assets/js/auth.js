/** auth.js — autenticação do frontend com cookies HttpOnly */
const Auth = (() => {
  const login = async (email, password) => {
    return Api.request("POST", "/auth/login", { email, password });
  };

  const logout = async () => {
    return Api.request("POST", "/auth/logout");
  };

  const me = async () => {
    return Api.request("GET", "/auth/me");
  };

  const registerInitialOwner = async ({ nome, email, password, registrationToken }) => {
    return Api.request("POST", "/auth/register", { nome, email, password, registrationToken });
  };

  return { login, logout, me, registerInitialOwner };
})();
