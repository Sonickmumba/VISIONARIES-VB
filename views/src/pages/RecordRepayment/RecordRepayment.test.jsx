import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import { describe, it, expect, vi, beforeEach } from "vitest";
import groupsReducer from "../../store/slices/groupSlice";
import cyclesReducer from "../../store/slices/cycleSlice";
import memberReducer from "../../store/slices/memberSlice";
import loanReducer from "../../store/slices/loanSlice";
import { RecordRepayment } from "./RecordRepayment";
import axios from "axios";

vi.mock("axios");

const makeStore = () =>
  configureStore({
    reducer: {
      groups: groupsReducer,
      cycles: cyclesReducer,
      members: memberReducer,
      loans: loanReducer,
    },
    preloadedState: {
      groups: { groups: [], selectedGroup: { id: "g1" }, loading: false, error: null },
      cycles: { currentCycle: { id: "c1" }, loading: false, error: null },
      members: { members: [{ id: "m1", name: "Test Member", group_id: "g1" }], selectedMember: null, loading: false, error: null, stale: false },
      loans: { loans: [{ id: "l1", memberId: "m1", memberName: "Test Member", cycleId: "c1", amount: 1000, interestAmount: 0, balance: 500, status: "disbursed", purpose: "Business", repayments: [] }], stale: false, loading: false, error: null },
    },
    middleware: (getDefaultMiddleware) => getDefaultMiddleware({ serializableCheck: false }),
  });

const renderComponent = (store) =>
  render(
    <Provider store={store}>
      <MemoryRouter initialEntries={["/repay/m1"]}>
        <Routes>
          <Route path="/repay/:memberId" element={<RecordRepayment />} />
        </Routes>
      </MemoryRouter>
    </Provider>
  );

describe("RecordRepayment component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("prevents duplicate submission while current request is in-flight", async () => {
    const store = makeStore();
    let resolveUpload;
    const uploadPromise = new Promise((resolve) => {
      resolveUpload = resolve;
    });

    // First /api/upload call delayed, second repay call resolves once made.
    axios.post.mockImplementation((url) => {
      if (url === "/api/upload") {
        return uploadPromise;
      }
      if (url === "/api/loans/l1/repay") {
        return Promise.resolve({ data: { data: { id: "r1", loan_id: "l1", amount: 100 } } });
      }
      return Promise.reject(new Error("Unexpected call: " + url));
    });

    renderComponent(store);

    const user = userEvent.setup();

    const selects = screen.getAllByRole("combobox");
    const memberSelect = selects[0];
    const paymentMethodSelect = selects[1];

    await user.selectOptions(memberSelect, "m1");
    const amountInput = screen.getByRole("spinbutton");
    await user.type(amountInput, "100");
    await user.type(screen.getByPlaceholderText("Transaction ID or reference"), "ABC123");

    const proofFile = new File(["proof"], "proof.png", { type: "image/png" });
    const input = screen.getByTestId("proof-file");
    expect(input).toBeInTheDocument();
    await user.upload(input, proofFile);

    const submitBtn = screen.getByRole("button", { name: /record repayment/i });

    // First click triggers the upload request and sets submitting state
    await user.click(submitBtn);

    const recordingBtn = await screen.findByRole("button", { name: /recording.../i });
    expect(recordingBtn).toBeDisabled();

    // Second click while pending should not enqueue another upload call
    await user.click(recordingBtn);
    expect(axios.post).toHaveBeenCalledTimes(1);

    // Resolve uploads and wait for redux update
    resolveUpload({ data: { url: "https://example.com/proof.png" } });

    await waitFor(() => {
      expect(store.getState().loans.loans[0].repayments.length).toBe(1);
    });
  });
});