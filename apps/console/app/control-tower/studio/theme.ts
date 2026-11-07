// AG Studio theme for the control tower, mirroring apps/console/app/review/accounts-grid.tsx's
// themeQuartz.withParams({...}) pattern (and the AG Grid PayPal starter's own studio/theme.ts,
// .vendor/ag-grid-starter/app/dashboard/studio/theme.ts) but pointed at Ringfence's own tokens
// (ink/spark/mist from design.md), not the starter's PayPal navy/blue.
import { studioTheme } from "ag-studio";

const token = (name: string) => `var(--rf-${name})`;
const line = (color: string) => ({ width: 1, color: token(color) });

export const ringfenceStudioTheme = studioTheme.withParams({
  fontFamily: "var(--font-sans)",
  fontSize: 14,
  textColor: token("ink"),
  foregroundColor: token("ink"),
  subtleTextColor: token("slate"),
  backgroundColor: token("white"),
  borderColor: token("hairline"),
  accentColor: token("spark"),
  iconColor: token("ink"),
  rowHoverColor: token("mist"),

  // No frame: the canvas is the page's own mist background. Widgets are the shell's cards.
  studioWrapperBorder: false,
  studioWrapperBorderRadius: 0,
  studioWrapperSpacing: 0,
  studioWrapperBackgroundColor: token("mist"),
  studioCanvasBorder: false,
  studioCanvasBorderRadius: 0,
  studioCanvasShadow: false,
  studioCanvasBackgroundColor: token("mist"),
  // Trimmed from 24/18 (was ~1006px tall at 1440 wide, overflowing a ~900px viewport) so the whole
  // page fits without scrolling at the spec's target size, now that each stat card also carries
  // more content (a baseline line, a release button, a retrain button) than it used to.
  studioCanvasPadding: 16,
  studioCanvasRowHeight: 16,
  studioCanvasFontFamily: "var(--font-sans)",

  studioWidgetBackgroundColor: token("white"),
  studioWidgetBorder: line("hairline"),
  studioWidgetBorderRadius: 20,
  studioWidgetPadding: 16,
  studioWidgetTitleFontFamily: "var(--font-sans)",
  studioWidgetTitleFontSize: 20,
  studioWidgetTitleFontWeight: 600,
  studioWidgetTitleTextColor: token("ink"),
  studioWidgetSubtitleFontFamily: "var(--font-sans)",
  studioWidgetSubtitleFontSize: 13,
  studioWidgetSubtitleTextColor: token("slate"),
  studioWidgetCaptionFontFamily: "var(--font-sans)",
  studioWidgetCaptionFontSize: 13,
  studioWidgetCaptionTextColor: token("slate"),
  // Only ever visible as a focus ring here, never an actual resize handle: mode="view" (see
  // control-tower.tsx) exposes no drag/resize UI at all. Coral reads as an unexplained alarm when
  // it shows up on browser focus with nothing to resize, so it's neutralized to the ordinary
  // card border instead of the brand's one reserved highlight colour.
  studioWidgetResizeBorderColor: token("hairline"),

  studioPanelContainerBackgroundColor: token("white"),
  studioPanelContainerBorder: line("hairline"),
  studioPanelContainerBorderRadius: 0,
  studioPanelDividerColor: token("hairline"),
  studioPanelDividerActiveColor: token("spark"),
  studioPanelSectionBorderColor: token("hairline"),
  studioPanelHeaderFontFamily: "var(--font-sans)",
  studioPanelHeaderFontWeight: 600,
  studioPanelChevronButtonHoverBackgroundColor: token("mist"),
  studioPanelChevronButtonHoverColor: token("spark"),
  studioToggleButtonActiveBackgroundColor: token("mist"),
  studioToggleButtonActiveBorderColor: token("spark"),
  studioToggleButtonActiveColor: token("spark"),

  gridFontFamily: "var(--font-sans)",
  gridFontSize: 14,
  gridCellTextColor: token("ink"),
  gridHeaderBackgroundColor: token("white"),
  gridHeaderTextColor: token("slate"),
  gridHeaderFontWeight: 600,
  gridHeaderFontSize: 13,
  gridRowHeight: 40,
  gridRowBorder: line("hairline"),
  gridHeaderRowBorder: line("hairline"),
  gridPinnedRowBorder: line("hairline"),
  gridRowHoverColor: token("mist"),
  gridWrapperBorder: false,

  chartFontFamily: "var(--font-sans)",
  chartTextColor: token("ink"),
  chartSubtleTextColor: token("slate"),
  chartAxisLineColor: token("hairline"),
  chartGridLineColor: token("hairline"),
});
