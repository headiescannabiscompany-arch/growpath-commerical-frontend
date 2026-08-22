import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps
} from "react-native";

import {
  calculateBusinessDesk,
  type BusinessDeskTax,
  type BusinessDeskWorkspace,
  type PriceMarginCalculationInput,
  type PriceMarginCalculationResult
} from "@/api/businessDesk";
import InlineError from "@/components/InlineError";
import AppCard from "@/components/layout/AppCard";
import AppPage from "@/components/layout/AppPage";
import {
  formatBasisPoints,
  formatMoneyMinor,
  formatQuantityMicros,
  parseMoneyInput,
  parsePercentInput,
  parseQuantityInput,
  resolveCurrencyContext,
  type CurrencyContext
} from "@/features/businessDesk/money";
import { useAppTheme, type ThemePalette } from "@/theme/appTheme";
import { radius } from "@/theme/theme";

type TaxType = "none" | "percent" | "fixed";

type PriceMarginToolProps = {
  workspace: BusinessDeskWorkspace;
  workspaceLabel: "Commercial" | "Facility";
  basePath: string;
};

type FieldProps = TextInputProps & {
  label: string;
  hint?: string;
  styles: ReturnType<typeof createStyles>;
};

function Field({ label, hint, styles, ...inputProps }: FieldProps) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        {...inputProps}
        accessibilityLabel={inputProps.accessibilityLabel || label}
        placeholderTextColor={styles.inputPlaceholder.color}
        style={[styles.input, inputProps.style]}
      />
      {hint ? <Text style={styles.fieldHint}>{hint}</Text> : null}
    </View>
  );
}

function optionalMoney(value: string, context: CurrencyContext, label: string): number {
  return parseMoneyInput(value, context, { label, allowBlank: true }) ?? 0;
}

function resultReason(reason: string | null | undefined) {
  if (reason === "DIRECT_COST_UNKNOWN") {
    return "Add a reviewed direct cost before using the break-even result.";
  }
  if (reason === "NO_POSITIVE_CONTRIBUTION") {
    return "This scenario has no positive contribution, so it has no finite break-even point.";
  }
  return "Break-even is unavailable for the current inputs.";
}

function desiredMarginReason(reason: string | null | undefined) {
  if (reason === "DIRECT_COST_UNKNOWN") {
    return "Add a reviewed direct unit cost before using a target-margin price.";
  }
  return "The server could not produce a desired unit price for this target margin.";
}

export default function PriceMarginTool({
  workspace,
  workspaceLabel,
  basePath
}: PriceMarginToolProps) {
  const { palette } = useAppTheme();
  const styles = useMemo(() => createStyles(palette), [palette]);
  const [currency, setCurrency] = useState("USD");
  const [unitPrice, setUnitPrice] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [unitDirectCost, setUnitDirectCost] = useState("");
  const [targetMarginPercent, setTargetMarginPercent] = useState("");
  const [discountPercent, setDiscountPercent] = useState("");
  const [discountFixed, setDiscountFixed] = useState("");
  const [customerShipping, setCustomerShipping] = useState("");
  const [businessFees, setBusinessFees] = useState("");
  const [shippingCost, setShippingCost] = useState("");
  const [fixedCosts, setFixedCosts] = useState("");
  const [taxType, setTaxType] = useState<TaxType>("none");
  const [taxRate, setTaxRate] = useState("");
  const [taxAmount, setTaxAmount] = useState("");
  const [taxShipping, setTaxShipping] = useState(false);
  const [result, setResult] = useState<PriceMarginCalculationResult | null>(null);
  const [resultFingerprint, setResultFingerprint] = useState("");
  const [error, setError] = useState<Error | null>(null);
  const [busy, setBusy] = useState(false);

  const inputFingerprint = JSON.stringify([
    currency,
    unitPrice,
    quantity,
    unitDirectCost,
    targetMarginPercent,
    discountPercent,
    discountFixed,
    customerShipping,
    businessFees,
    shippingCost,
    fixedCosts,
    taxType,
    taxRate,
    taxAmount,
    taxShipping
  ]);
  const currentResult = resultFingerprint === inputFingerprint ? result : null;
  const inputsChanged = Boolean(result && !currentResult);

  const resetScenario = () => {
    setCurrency("USD");
    setUnitPrice("");
    setQuantity("1");
    setUnitDirectCost("");
    setTargetMarginPercent("");
    setDiscountPercent("");
    setDiscountFixed("");
    setCustomerShipping("");
    setBusinessFees("");
    setShippingCost("");
    setFixedCosts("");
    setTaxType("none");
    setTaxRate("");
    setTaxAmount("");
    setTaxShipping(false);
    setResult(null);
    setResultFingerprint("");
    setError(null);
  };

  const runCalculation = async () => {
    setError(null);
    setBusy(true);
    try {
      const context = resolveCurrencyContext(currency);
      const quantityMicros = parseQuantityInput(quantity, { label: "Quantity" });
      if (!quantityMicros || quantityMicros <= 0) {
        throw new Error("Quantity must be greater than zero.");
      }
      const unitPriceMinor = parseMoneyInput(unitPrice, context, {
        label: "Selling price"
      });
      if (unitPriceMinor === null) throw new Error("Selling price is required.");
      const unitDirectCostMinor = parseMoneyInput(unitDirectCost, context, {
        label: "Direct unit cost",
        allowBlank: true
      });
      const percentBasisPoints =
        parsePercentInput(discountPercent, {
          label: "Discount percentage",
          allowBlank: true
        }) ?? 0;
      const targetMarginBasisPoints = parsePercentInput(targetMarginPercent, {
        label: "Target margin",
        allowBlank: true
      });
      if (targetMarginBasisPoints !== null && targetMarginBasisPoints >= 10_000) {
        throw new Error("Target margin must be less than 100%.");
      }

      let tax: BusinessDeskTax = { type: "none" };
      if (taxType === "fixed") {
        const amountMinor = parseMoneyInput(taxAmount, context, {
          label: "Tax amount"
        });
        if (amountMinor === null) throw new Error("Tax amount is required.");
        tax = { type: "fixed", amountMinor, currency: context.currency };
      } else if (taxType === "percent") {
        const basisPoints = parsePercentInput(taxRate, { label: "Tax rate" });
        if (basisPoints === null) throw new Error("Tax rate is required.");
        tax = {
          type: "percent",
          basisPoints,
          base: taxShipping ? "discounted_subtotal_plus_shipping" : "discounted_subtotal",
          currency: context.currency
        };
      }

      const input: PriceMarginCalculationInput = {
        calculator: "price_margin",
        ...context,
        unitPriceMinor,
        quantityMicros,
        unitDirectCostMinor,
        businessFeesMinor: optionalMoney(businessFees, context, "Scenario fees"),
        shippingCostMinor: optionalMoney(
          shippingCost,
          context,
          "Scenario fulfillment cost"
        ),
        customerShippingMinor: optionalMoney(
          customerShipping,
          context,
          "Customer shipping charge"
        ),
        fixedCostsMinor: optionalMoney(fixedCosts, context, "Fixed costs"),
        ...(targetMarginBasisPoints !== null ? { targetMarginBasisPoints } : {}),
        discount: {
          order: "percent_then_fixed",
          percentBasisPoints,
          fixedMinor: optionalMoney(discountFixed, context, "Fixed discount")
        },
        tax
      };

      const nextResult = await calculateBusinessDesk<PriceMarginCalculationResult>(
        workspace,
        input
      );
      setResult(nextResult);
      setResultFingerprint(inputFingerprint);
    } catch (nextError) {
      setResult(null);
      setResultFingerprint("");
      setError(
        nextError instanceof Error
          ? nextError
          : new Error("The calculation could not be completed.")
      );
    } finally {
      setBusy(false);
    }
  };

  const resultContext = currentResult
    ? {
        currency: currentResult.currency,
        minorUnitDigits: currentResult.minorUnitDigits
      }
    : null;

  return (
    <AppPage
      routeKey="business-desk-price-margin"
      railOverride={null}
      longContent
      backFallbackHref={basePath}
      header={
        <View style={styles.header}>
          <Text style={styles.kicker}>{workspaceLabel} Business Desk</Text>
          <Text accessibilityRole="header" aria-level={1} style={styles.title}>
            Price & Margin
          </Text>
          <Text style={styles.subtitle}>
            Calculate one explicit sales scenario. Unknown cost stays unknown, tax is used
            only when you enter it, and break-even repeats this exact scenario.
          </Text>
        </View>
      }
    >
      <AppCard
        title="Sales scenario"
        titleLevel={2}
        subtitle="Amounts use the selected currency. Quantity may include up to six decimal places."
      >
        <View style={styles.fieldGrid}>
          <Field
            label="Currency"
            accessibilityLabel="Price and margin currency"
            autoCapitalize="characters"
            autoCorrect={false}
            maxLength={3}
            value={currency}
            onChangeText={setCurrency}
            hint="Three-letter code; no currency conversion."
            styles={styles}
          />
          <Field
            label="Selling price per unit"
            accessibilityLabel="Price and margin selling price"
            keyboardType="decimal-pad"
            value={unitPrice}
            onChangeText={setUnitPrice}
            placeholder="25.00"
            styles={styles}
          />
          <Field
            label="Quantity in this sale"
            accessibilityLabel="Price and margin quantity"
            keyboardType="decimal-pad"
            value={quantity}
            onChangeText={setQuantity}
            placeholder="1"
            styles={styles}
          />
          <Field
            label="Direct cost per unit (optional)"
            accessibilityLabel="Price and margin direct unit cost"
            keyboardType="decimal-pad"
            value={unitDirectCost}
            onChangeText={setUnitDirectCost}
            placeholder="Leave blank if unknown"
            hint="Blank makes profit, margin, markup, and break-even incomplete."
            styles={styles}
          />
          <Field
            label="Target gross margin percent (optional)"
            accessibilityLabel="Price and margin target margin percent"
            keyboardType="decimal-pad"
            value={targetMarginPercent}
            onChangeText={setTargetMarginPercent}
            placeholder="25"
            hint="Must be below 100%. The server uses reviewed direct unit cost only."
            styles={styles}
          />
        </View>
      </AppCard>

      <AppCard
        title="Scenario adjustments"
        titleLevel={2}
        subtitle="Percentage discount is applied first, then the fixed discount. These amounts apply once to this sale."
      >
        <View style={styles.fieldGrid}>
          <Field
            label="Discount percent"
            accessibilityLabel="Price and margin discount percent"
            keyboardType="decimal-pad"
            value={discountPercent}
            onChangeText={setDiscountPercent}
            placeholder="0"
            styles={styles}
          />
          <Field
            label="Fixed discount"
            accessibilityLabel="Price and margin fixed discount"
            keyboardType="decimal-pad"
            value={discountFixed}
            onChangeText={setDiscountFixed}
            placeholder="0.00"
            styles={styles}
          />
          <Field
            label="Shipping charged to customer"
            accessibilityLabel="Price and margin customer shipping"
            keyboardType="decimal-pad"
            value={customerShipping}
            onChangeText={setCustomerShipping}
            placeholder="0.00"
            styles={styles}
          />
          <Field
            label="Business/payment fees for this sale"
            accessibilityLabel="Price and margin business fees"
            keyboardType="decimal-pad"
            value={businessFees}
            onChangeText={setBusinessFees}
            placeholder="0.00"
            styles={styles}
          />
          <Field
            label="Fulfillment/shipping cost for this sale"
            accessibilityLabel="Price and margin fulfillment cost"
            keyboardType="decimal-pad"
            value={shippingCost}
            onChangeText={setShippingCost}
            placeholder="0.00"
            styles={styles}
          />
          <Field
            label="Fixed costs to recover"
            accessibilityLabel="Price and margin fixed costs"
            keyboardType="decimal-pad"
            value={fixedCosts}
            onChangeText={setFixedCosts}
            placeholder="0.00"
            hint="Used for break-even; not subtracted from scenario gross profit."
            styles={styles}
          />
        </View>
      </AppCard>

      <AppCard
        title="Tax entered by you"
        titleLevel={2}
        subtitle="GrowPathAI does not choose a tax rate or decide taxability."
      >
        <View accessibilityRole="radiogroup" style={styles.choiceRow}>
          {(["none", "percent", "fixed"] as TaxType[]).map((value) => (
            <Pressable
              key={value}
              accessibilityRole="radio"
              accessibilityState={{ checked: taxType === value }}
              accessibilityLabel={`Tax type ${value}`}
              onPress={() => setTaxType(value)}
              style={[styles.choice, taxType === value && styles.choiceActive]}
            >
              <Text
                style={[styles.choiceText, taxType === value && styles.choiceTextActive]}
              >
                {value === "none" ? "No tax" : value === "percent" ? "Rate" : "Amount"}
              </Text>
            </Pressable>
          ))}
        </View>
        {taxType === "percent" ? (
          <View style={styles.fieldGrid}>
            <Field
              label="Tax rate percent"
              accessibilityLabel="Price and margin tax rate"
              keyboardType="decimal-pad"
              value={taxRate}
              onChangeText={setTaxRate}
              placeholder="0"
              styles={styles}
            />
            <Pressable
              accessibilityRole="checkbox"
              accessibilityState={{ checked: taxShipping }}
              accessibilityLabel="Include customer shipping in tax base"
              onPress={() => setTaxShipping((current) => !current)}
              style={styles.checkboxRow}
            >
              <View style={[styles.checkbox, taxShipping && styles.checkboxChecked]} />
              <Text style={styles.checkboxLabel}>
                Include the customer shipping charge in the tax base
              </Text>
            </Pressable>
          </View>
        ) : null}
        {taxType === "fixed" ? (
          <Field
            label="Tax amount"
            accessibilityLabel="Price and margin tax amount"
            keyboardType="decimal-pad"
            value={taxAmount}
            onChangeText={setTaxAmount}
            placeholder="0.00"
            styles={styles}
          />
        ) : null}
      </AppCard>

      {error ? <InlineError error={error} /> : null}
      {inputsChanged ? (
        <View style={styles.notice}>
          <Text style={styles.noticeText}>
            Inputs changed. Recalculate before using the prior result.
          </Text>
        </View>
      ) : null}
      <View style={styles.actionRow}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Calculate price and margin"
          disabled={busy}
          onPress={() => void runCalculation()}
          style={[styles.primaryButton, busy && styles.disabled]}
        >
          {busy ? (
            <ActivityIndicator color={palette.accentText} />
          ) : (
            <Text style={styles.primaryButtonText}>Calculate scenario</Text>
          )}
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Reset price and margin scenario"
          disabled={busy}
          onPress={resetScenario}
          style={[styles.secondaryButton, busy && styles.disabled]}
        >
          <Text style={styles.secondaryButtonText}>Reset scenario</Text>
        </Pressable>
      </View>

      {currentResult && resultContext ? (
        <>
          <AppCard
            title="Scenario result"
            titleLevel={2}
            subtitle="Gross profit is a planning result from the known direct costs—not net income, tax advice, or bookkeeping."
          >
            <View style={styles.metricGrid}>
              <View style={styles.metric}>
                <Text style={styles.metricLabel}>Revenue before tax</Text>
                <Text style={styles.metricValue}>
                  {formatMoneyMinor(
                    currentResult.totals.customerRevenueBeforeTaxMinor,
                    resultContext
                  )}
                </Text>
              </View>
              <View style={styles.metric}>
                <Text style={styles.metricLabel}>Customer total</Text>
                <Text style={styles.metricValue}>
                  {formatMoneyMinor(currentResult.totals.totalMinor, resultContext)}
                </Text>
              </View>
              <View style={styles.metric}>
                <Text style={styles.metricLabel}>Known costs</Text>
                <Text style={styles.metricValue}>
                  {formatMoneyMinor(currentResult.totals.knownCostMinor, resultContext)}
                </Text>
              </View>
              <View style={styles.metric}>
                <Text style={styles.metricLabel}>Gross profit</Text>
                <Text style={styles.metricValue}>
                  {formatMoneyMinor(currentResult.totals.grossProfitMinor, resultContext)}
                </Text>
              </View>
              <View style={styles.metric}>
                <Text style={styles.metricLabel}>Gross margin</Text>
                <Text style={styles.metricValue}>
                  {formatBasisPoints(currentResult.totals.marginBasisPoints)}
                </Text>
              </View>
              <View style={styles.metric}>
                <Text style={styles.metricLabel}>Markup on known cost</Text>
                <Text style={styles.metricValue}>
                  {formatBasisPoints(currentResult.totals.markupBasisPoints)}
                </Text>
              </View>
            </View>
            {!currentResult.totals.complete ? (
              <View style={styles.incompleteBox}>
                <Text style={styles.incompleteTitle}>Profitability is incomplete</Text>
                <Text style={styles.incompleteText}>
                  Missing direct cost is not treated as zero. Add the reviewed cost and
                  recalculate before relying on margin or markup.
                </Text>
              </View>
            ) : null}
          </AppCard>

          {currentResult.desiredMargin?.targetMarginBasisPoints !== null &&
          currentResult.desiredMargin?.targetMarginBasisPoints !== undefined ? (
            <AppCard
              title="Target-margin unit price"
              titleLevel={2}
              subtitle={`Server result for a ${formatBasisPoints(
                currentResult.desiredMargin.targetMarginBasisPoints
              )} gross-margin target.`}
            >
              {currentResult.desiredMargin.desiredUnitPriceMinor === null ? (
                <View style={styles.incompleteBox}>
                  <Text style={styles.incompleteTitle}>
                    Desired unit price unavailable
                  </Text>
                  <Text style={styles.incompleteText}>
                    {desiredMarginReason(currentResult.desiredMargin.reason)}
                  </Text>
                </View>
              ) : (
                <View style={styles.metricGrid}>
                  <View style={styles.metric}>
                    <Text style={styles.metricLabel}>Desired unit price</Text>
                    <Text style={styles.metricValue}>
                      {formatMoneyMinor(
                        currentResult.desiredMargin.desiredUnitPriceMinor,
                        resultContext
                      )}
                    </Text>
                  </View>
                </View>
              )}
              <Text style={styles.bodyText}>
                This price uses the reviewed direct unit cost only. It does not solve for
                this scenario&apos;s discounts, fees, shipping, tax, or fixed costs.
              </Text>
            </AppCard>
          ) : null}

          <AppCard
            title="Break-even"
            titleLevel={2}
            subtitle={`This repeats the exact ${formatQuantityMicros(
              currentResult.totals.quantityMicros
            )}-unit sales scenario, including its scenario-level adjustments.`}
          >
            {currentResult.breakEven.salesScenarios === null ? (
              <Text style={styles.bodyText}>
                {resultReason(currentResult.breakEven.reason)}
              </Text>
            ) : (
              <View style={styles.metricGrid}>
                <View style={styles.metric}>
                  <Text style={styles.metricLabel}>Sales needed</Text>
                  <Text style={styles.metricValue}>
                    {currentResult.breakEven.salesScenarios.toLocaleString()}
                  </Text>
                </View>
                <View style={styles.metric}>
                  <Text style={styles.metricLabel}>Total quantity</Text>
                  <Text style={styles.metricValue}>
                    {formatQuantityMicros(currentResult.breakEven.quantityMicros)}
                  </Text>
                </View>
                <View style={styles.metric}>
                  <Text style={styles.metricLabel}>Break-even revenue</Text>
                  <Text style={styles.metricValue}>
                    {formatMoneyMinor(
                      currentResult.breakEven.revenueMinor,
                      resultContext
                    )}
                  </Text>
                </View>
              </View>
            )}
          </AppCard>

          <AppCard title="Calculation boundary" titleLevel={2}>
            <Text style={styles.bodyText}>
              Currency: {currentResult.currency} · minor-unit digits:{" "}
              {String(currentResult.minorUnitDigits)} · quantity scale:{" "}
              {currentResult.quantityScale.toLocaleString()} · rates: basis points ·
              rounding: half away from zero.
            </Text>
            <Text style={styles.bodyText}>
              This calculator is deterministic and does not use AI credits. It does not
              save a business record, change B‑02 inventory, send a quote, or contact a
              payment provider.
            </Text>
          </AppCard>
        </>
      ) : null}
    </AppPage>
  );
}

export function createStyles(palette: ThemePalette) {
  return StyleSheet.create({
    actionRow: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
    bodyText: { color: palette.textMuted, fontSize: 13, lineHeight: 20, marginTop: 6 },
    checkbox: {
      borderColor: palette.border,
      borderRadius: 4,
      borderWidth: 2,
      height: 20,
      width: 20
    },
    checkboxChecked: { backgroundColor: palette.accent, borderColor: palette.accent },
    checkboxLabel: { color: palette.text, flex: 1, fontSize: 13, lineHeight: 19 },
    checkboxRow: {
      alignItems: "center",
      flexBasis: 280,
      flexDirection: "row",
      flexGrow: 1,
      gap: 9,
      minHeight: 48,
      paddingVertical: 8
    },
    choice: {
      alignItems: "center",
      backgroundColor: palette.surface,
      borderColor: palette.border,
      borderRadius: 999,
      borderWidth: 1,
      minHeight: 44,
      paddingHorizontal: 15,
      paddingVertical: 11
    },
    choiceActive: { backgroundColor: palette.accent, borderColor: palette.accent },
    choiceRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 12 },
    choiceText: { color: palette.text, fontSize: 13, fontWeight: "800" },
    choiceTextActive: { color: palette.accentText },
    disabled: { opacity: 0.65 },
    field: { flexBasis: 240, flexGrow: 1, gap: 5, minWidth: 220 },
    fieldGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
    fieldHint: { color: palette.textMuted, fontSize: 11, lineHeight: 16 },
    fieldLabel: { color: palette.text, fontSize: 13, fontWeight: "800" },
    header: { gap: 6 },
    incompleteBox: {
      backgroundColor: palette.surfaceMuted,
      borderColor: palette.warning,
      borderRadius: radius.card,
      borderWidth: 1,
      marginTop: 14,
      padding: 12
    },
    incompleteText: {
      color: palette.textMuted,
      fontSize: 13,
      lineHeight: 19,
      marginTop: 4
    },
    incompleteTitle: { color: palette.warning, fontSize: 14, fontWeight: "900" },
    input: {
      backgroundColor: palette.surface,
      borderColor: palette.border,
      borderRadius: radius.card,
      borderWidth: 1,
      color: palette.text,
      fontSize: 15,
      minHeight: 46,
      paddingHorizontal: 12,
      paddingVertical: 10
    },
    inputPlaceholder: { color: palette.textMuted },
    kicker: {
      color: palette.accent,
      fontSize: 12,
      fontWeight: "900",
      textTransform: "uppercase"
    },
    metric: {
      backgroundColor: palette.surfaceMuted,
      borderColor: palette.borderSoft,
      borderRadius: radius.card,
      borderWidth: 1,
      flexBasis: 180,
      flexGrow: 1,
      minWidth: 160,
      padding: 12
    },
    metricGrid: { flexDirection: "row", flexWrap: "wrap", gap: 9 },
    metricLabel: { color: palette.textMuted, fontSize: 11, fontWeight: "800" },
    metricValue: { color: palette.text, fontSize: 20, fontWeight: "900", marginTop: 5 },
    notice: {
      backgroundColor: palette.surfaceMuted,
      borderColor: palette.warning,
      borderRadius: radius.card,
      borderWidth: 1,
      padding: 11
    },
    noticeText: { color: palette.text, fontSize: 13, lineHeight: 19 },
    primaryButton: {
      alignItems: "center",
      backgroundColor: palette.accent,
      borderRadius: radius.card,
      flexGrow: 1,
      justifyContent: "center",
      minHeight: 48,
      minWidth: 210,
      paddingHorizontal: 18,
      paddingVertical: 12
    },
    primaryButtonText: { color: palette.accentText, fontSize: 15, fontWeight: "900" },
    secondaryButton: {
      alignItems: "center",
      backgroundColor: palette.surface,
      borderColor: palette.border,
      borderRadius: radius.card,
      borderWidth: 1,
      justifyContent: "center",
      minHeight: 48,
      minWidth: 150,
      paddingHorizontal: 18,
      paddingVertical: 12
    },
    secondaryButtonText: { color: palette.text, fontSize: 14, fontWeight: "900" },
    subtitle: { color: palette.textMuted, fontSize: 15, lineHeight: 22, maxWidth: 820 },
    title: { color: palette.text, fontSize: 30, fontWeight: "900" }
  });
}
