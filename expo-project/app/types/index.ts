export interface User {
  username: string;
  uuid: string;
}

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface RegisterCredentials {
  username: string;
  password: string;
  email: string;
  phone: string;
}

export type ViewType = "login" | "register" | "home" | "newMessage" | "sendInvite";
