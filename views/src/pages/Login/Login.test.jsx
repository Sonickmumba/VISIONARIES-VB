import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import { describe, it, expect, vi, beforeAll, beforeEach } from "vitest";
import authReducer from "../../store/slices/authSlice";
import axios from "axios";

vi.mock("axios");

// framer-motion needs IntersectionObserver in jsdom
beforeAll(() => {
  global.IntersectionObserver = class {
    constructor() {}
    observe() {}
    unobserve() {}
    disconnect() {}
  };
});

// Dynamically import Login so the axios mock is in place
let Login;
beforeAll(async () => {
  ({ Login } = await import("./Login"));
});

const makeStore = (preloadedState) =>
  configureStore({
    reducer: { auth: authReducer },
    middleware: (gDM) => gDM({ serializableCheck: false }),
    preloadedState: preloadedState ?? {
      auth: { user: null, loading: false, initializing: false, error: null },
    },
  });

const renderLogin = (store) =>
  render(
    <Provider store={store ?? makeStore()}>
      <MemoryRouter>
        <Login />
      </MemoryRouter>
    </Provider>
  );

describe("Login page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it("renders the login form", () => {
    renderLogin();
    expect(screen.getByText("VISIONARIES VB")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("user@example.com")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Enter your password")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /sign in/i })).toBeInTheDocument();
  });

  it("renders demo account buttons", () => {
    renderLogin();
    expect(screen.getByText("admin@vb.com")).toBeInTheDocument();
    expect(screen.getByText("superadmin@vb.com")).toBeInTheDocument();
    expect(screen.getByText("amina@example.com")).toBeInTheDocument();
  });

  it("fills email and password when a demo account is clicked", async () => {
    const user = userEvent.setup();
    renderLogin();

    await user.click(screen.getByText("admin@vb.com"));

    expect(screen.getByPlaceholderText("user@example.com")).toHaveValue("admin@vb.com");
    expect(screen.getByPlaceholderText("Enter your password")).toHaveValue("password");
  });

  it("dispatches login and navigates on success", async () => {
    axios.post.mockResolvedValueOnce({
      data: {
        data: {
          user: { id: "u1", name: "Admin", role: "admin" },
          token: "tok123",
        },
      },
    });

    const store = makeStore();
    const user = userEvent.setup();
    renderLogin(store);

    await user.type(screen.getByPlaceholderText("user@example.com"), "admin@vb.com");
    await user.type(screen.getByPlaceholderText("Enter your password"), "Demo@12345");
    await user.click(screen.getByRole("button", { name: /sign in/i }));

    await waitFor(() => {
      expect(store.getState().auth.user).toEqual({ id: "u1", name: "Admin", role: "admin" });
    });

    expect(axios.post).toHaveBeenCalledWith("/api/auth/login", {
      email: "admin@vb.com",
      password: "Demo@12345",
    });
  });

  it("shows error message on login failure", async () => {
    axios.post.mockRejectedValueOnce({
      response: { data: { message: "Invalid credentials" } },
    });

    const store = makeStore();
    const user = userEvent.setup();
    renderLogin(store);

    await user.type(screen.getByPlaceholderText("user@example.com"), "bad@vb.com");
    await user.type(screen.getByPlaceholderText("Enter your password"), "wrong");
    await user.click(screen.getByRole("button", { name: /sign in/i }));

    await waitFor(() => {
      expect(screen.getByText("Invalid credentials")).toBeInTheDocument();
    });
  });

  it("shows loading state while submitting", async () => {
    // Never-resolving promise to keep loading state
    axios.post.mockReturnValueOnce(new Promise(() => {}));

    const user = userEvent.setup();
    renderLogin();

    await user.type(screen.getByPlaceholderText("user@example.com"), "a@b.com");
    await user.type(screen.getByPlaceholderText("Enter your password"), "pass1234");
    await user.click(screen.getByRole("button", { name: /sign in/i }));

    await waitFor(() => {
      expect(screen.getByText("Signing in...")).toBeInTheDocument();
    });
  });

  it("has a link back to home", () => {
    renderLogin();
    expect(screen.getByRole("link", { name: /back to home/i })).toHaveAttribute("href", "/");
  });
});
