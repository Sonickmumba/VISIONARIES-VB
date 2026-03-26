import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import { describe, it, expect, vi, beforeAll, beforeEach } from "vitest";
import authReducer from "../store/slices/authSlice";
import axios from "axios";

vi.mock("axios");

// sonner toast mock
vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));
import { toast } from "sonner";

// framer-motion needs IntersectionObserver in jsdom
beforeAll(() => {
  global.IntersectionObserver = class {
    constructor() {}
    observe() {}
    unobserve() {}
    disconnect() {}
  };
});

let Signup;
beforeAll(async () => {
  ({ Signup } = await import("./Signup"));
});

const makeStore = () =>
  configureStore({
    reducer: { auth: authReducer },
    middleware: (gDM) => gDM({ serializableCheck: false }),
    preloadedState: {
      auth: { user: null, loading: false, initializing: false, error: null },
    },
  });

const renderSignup = (store) =>
  render(
    <Provider store={store ?? makeStore()}>
      <MemoryRouter>
        <Signup />
      </MemoryRouter>
    </Provider>
  );

const validForm = {
  name: "John Doe",
  email: "john@example.com",
  phone: "0977123456",
  nationalId: "123456/78/1",
  password: "Demo@12345",
  confirmPassword: "Demo@12345",
};

async function fillForm(user, data = validForm) {
  await user.type(screen.getByPlaceholderText("Enter your full name"), data.name);
  await user.type(screen.getByPlaceholderText("you@example.com"), data.email);
  await user.type(screen.getByPlaceholderText("0977 123456"), data.phone);
  await user.type(screen.getByPlaceholderText("123456/78/1"), data.nationalId);
  await user.type(screen.getByPlaceholderText("Create a strong password"), data.password);
  await user.type(screen.getByPlaceholderText("Confirm your password"), data.confirmPassword);
}

describe("Signup page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it("renders the signup form", () => {
    renderSignup();
    expect(screen.getByText("Join VISIONARIES VB")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Enter your full name")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("you@example.com")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("0977 123456")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("123456/78/1")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Create a strong password")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Confirm your password")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /create account/i })).toBeInTheDocument();
  });

  it("shows validation errors for empty required fields", async () => {
    const user = userEvent.setup();
    renderSignup();

    await user.click(screen.getByRole("button", { name: /create account/i }));

    expect(screen.getByText("Full name is required")).toBeInTheDocument();
    expect(screen.getByText("Email is required")).toBeInTheDocument();
    expect(screen.getByText("Phone number is required")).toBeInTheDocument();
    expect(screen.getByText("National ID is required")).toBeInTheDocument();
    expect(screen.getByText("Password is required")).toBeInTheDocument();
  });

  it("shows error when passwords don't match", async () => {
    const user = userEvent.setup();
    renderSignup();

    await fillForm(user, { ...validForm, confirmPassword: "Different1!" });
    await user.click(screen.getByRole("button", { name: /create account/i }));

    expect(screen.getByText("Passwords do not match")).toBeInTheDocument();
  });

  it("shows error for short password", async () => {
    const user = userEvent.setup();
    renderSignup();

    await fillForm(user, { ...validForm, password: "short", confirmPassword: "short" });
    await user.click(screen.getByRole("button", { name: /create account/i }));

    expect(screen.getByText("Password must be at least 8 characters")).toBeInTheDocument();
  });

  it("dispatches signup and navigates to login on success", async () => {
    axios.post.mockResolvedValueOnce({ data: { message: "Created" } });

    const store = makeStore();
    const user = userEvent.setup();
    renderSignup(store);

    await fillForm(user);
    await user.click(screen.getByRole("button", { name: /create account/i }));

    await waitFor(() => {
      expect(axios.post).toHaveBeenCalledWith("/api/auth/signup", {
        name: "John Doe",
        email: "john@example.com",
        phone: "0977123456",
        nationalId: "123456/78/1",
        password: "Demo@12345",
      });
    });

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith(
        "Account created successfully! Please login."
      );
    });
  });

  it("shows toast error on signup failure", async () => {
    axios.post.mockRejectedValueOnce({
      response: { data: { message: "Email already exists" } },
    });

    const user = userEvent.setup();
    renderSignup();

    await fillForm(user);
    await user.click(screen.getByRole("button", { name: /create account/i }));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Email already exists");
    });
  });

  it("has a link to login page", () => {
    renderSignup();
    expect(screen.getByRole("link", { name: /login here/i })).toHaveAttribute("href", "/login");
  });

  it("has a link back to home", () => {
    renderSignup();
    expect(screen.getByRole("link", { name: /back to home/i })).toHaveAttribute("href", "/");
  });
});
