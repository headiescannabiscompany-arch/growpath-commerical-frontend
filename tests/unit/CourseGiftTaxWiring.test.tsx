import React from "react";
import { Platform } from "react-native";
import { act, fireEvent, render } from "@testing-library/react-native";
import { InternalCourseGiftSaleScreen } from "@/components/courseGifts/CourseGiftSaleScreens";
import { validGiftMarket, sameGiftMarket } from "@/utils/courseGiftMarket";
import { validGiftSaleBody } from "@/api/courseGiftSaleContract";
import { validGiftTaxAmounts, boundBuyerStatus } from "@/components/courseGifts/courseGiftPresentation";
jest.mock("@/theme/appTheme", () => { const a=jest.requireActual("@/theme/appTheme");return {...a,useAppTheme:()=>({palette:a.getThemePalette("night","dark")})}; });
const ATTEMPT="a0000000-0000-4000-8000-000000000001";
const amounts={version:"course-gift-tax-amounts-v1" as const,taxBehavior:"inclusive" as const,listedAmountCents:2500,subtotalCents:2101,taxAmountCents:399,totalCents:2500,currency:"usd" as const};
beforeEach(() => { jest.replaceProperty(Platform, "OS", "web"); });
function screen(pending=false) {
  const status={giftId:"b".repeat(24),checkoutAttemptId:ATTEMPT,checkoutStatus:"completed",paymentRecorded:true,recoveryRequired:false,taxAmounts:amounts};
  const session:any={scope:"synthetic",assertCurrent:jest.fn(),recovery:()=>({buyerPending:pending,canReviewRetry:false}),dispose:jest.fn(),
    reviewBuyer:jest.fn(async()=>{throw Error("Stop after mocked review request");}),readBuyerStatus:jest.fn(async()=>status)};
  return {session,view:render(<InternalCourseGiftSaleScreen mode="buyer" session={session} onNavigateToCheckout={jest.fn()} />)};
}
describe("R09 durable tax buyer UI",()=>{
  test("US jurisdiction is optional for legacy wire but exact when present",()=>{
    const market={buyerCountry:"US",recipientCountry:"DE",buyerRegion:"MD"};
    expect(validGiftMarket(market)).toBe(true);expect(validGiftMarket({...market,buyerCountry:"DE"})).toBe(false);
    expect(sameGiftMarket(market as any,{...market,buyerRegion:"VA"} as any)).toBe(false);
    expect(validGiftSaleBody("buyerReview",{courseId:"a".repeat(24),checkoutAttemptId:ATTEMPT,recipientEmail:"synthetic@example.invalid",...market})).toBe(true);
  });
  test("US form requires a state and sends the normalized jurisdiction",async()=>{
    const {view,session}=screen();fireEvent.changeText(view.getByLabelText("Gift recipient email"),"synthetic@example.invalid");
    fireEvent.press(view.getByLabelText("Your country: United States"));fireEvent.press(view.getByLabelText("Recipient country: Germany"));
    await act(async()=>fireEvent.press(view.getByText("Get current gift review")));expect(session.reviewBuyer).not.toHaveBeenCalled();
    fireEvent.changeText(view.getByLabelText("Your state or territory"),"md");
    await act(async()=>fireEvent.press(view.getByText("Get current gift review")));
    expect(session.reviewBuyer).toHaveBeenCalledWith("synthetic@example.invalid",{buyerCountry:"US",recipientCountry:"DE",buyerRegion:"MD"});
  });
  test("switching away from US removes its jurisdiction from the request",async()=>{
    const {view,session}=screen();fireEvent.changeText(view.getByLabelText("Gift recipient email"),"synthetic@example.invalid");
    fireEvent.press(view.getByLabelText("Your country: United States"));fireEvent.changeText(view.getByLabelText("Your state or territory"),"MD");
    fireEvent.press(view.getByLabelText("Your country: Thailand"));fireEvent.press(view.getByLabelText("Recipient country: Thailand"));
    expect(view.queryByLabelText("Your state or territory")).toBeNull();await act(async()=>fireEvent.press(view.getByText("Get current gift review")));
    expect(session.reviewBuyer).toHaveBeenCalledWith("synthetic@example.invalid",{buyerCountry:"TH",recipientCountry:"TH"});
  });
  test("payment breakdown balances and rejects private references or invented tax",()=>{
    expect(validGiftTaxAmounts(amounts)).toBe(true);expect(validGiftTaxAmounts({...amounts,taxAmountCents:400})).toBe(false);
    expect(validGiftTaxAmounts({...amounts,treatmentReference:"private"})).toBe(false);
    expect(boundBuyerStatus({giftId:"b",checkoutAttemptId:ATTEMPT,checkoutStatus:"open",paymentRecorded:false,recoveryRequired:false,taxAmounts:amounts},ATTEMPT)).toBe(false);
  });
  test("paid screen shows subtotal, included tax and unchanged total without private tax-review data",async()=>{
    const {view}=screen(true);await act(async()=>fireEvent.press(view.getByText("Check gift payment status")));
    expect(view.getByText("Course before tax: $21.01")).toBeTruthy();expect(view.getByText("Included tax: $3.99")).toBeTruthy();expect(view.getByText("Total paid: $25.00 USD")).toBeTruthy();
    expect(JSON.stringify(view.toJSON())).not.toMatch(/txcd_|synthetic:tax|taxreg_/);
  });
});
