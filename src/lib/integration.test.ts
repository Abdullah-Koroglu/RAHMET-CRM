import { describe, expect, it } from "vitest";
import { normalizePhone } from "./integration";
import { parseGoogleSheetUrl } from "./google-forms";

describe("Google Forms integration helpers", () => {
  it("extracts spreadsheet id and gid", () => {
    expect(parseGoogleSheetUrl("https://docs.google.com/spreadsheets/d/sheet-123/edit?gid=456")).toMatchObject({ spreadsheetId: "sheet-123", sheetGid: "456" });
  });

  it("normalizes Turkish phone numbers", () => {
    expect(normalizePhone("0532 123 45 67")).toBe("+905321234567");
    expect(normalizePhone("5321234567")).toBe("+905321234567");
  });

  it("rejects unusable phone values", () => {
    expect(normalizePhone("123")).toBeNull();
  });
});
