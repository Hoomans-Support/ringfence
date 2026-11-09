// AG Studio theme for Insights, mirroring apps/console/app/review/accounts-grid.tsx's
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

  // No frame: the canvas is the page's own white. Its padding is also the gap between widgets, so
  // it stays; insights/page.tsx pulls the canvas out by the same 16px so the widgets (the
  // console's usual hairline cards) line up with the page's edges like every other screen's cards.
  studioWrapperBorder: false,
  studioWrapperBorderRadius: 0,
  studioWrapperSpacing: 0,
  studioWrapperBackgroundColor: token("white"),
  studioCanvasBorder: false,
  studioCanvasBorderRadius: 0,
  studioCanvasShadow: false,
  studioCanvasBackgroundColor: token("white"),
  studioCanvasPadding: 16,
  studioCanvasRowHeight: 16,
  // Edit mode puts three panels around the canvas (data, assistant, widget editor); Studio's default
  // 720px minimum would leave it scrolling sideways on a 1440px screen, so it may shrink a little more.
  studioCanvasMinWidth: 640,
  studioAiPanelWidth: 320,
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
  // insights.tsx) exposes no drag/resize UI at all. Coral reads as an unexplained alarm when
  // it shows up on browser focus with nothing to resize, so it's neutralized to the ordinary
  // card border instead of the brand's one reserved highlight colour.
  studioWidgetResizeBorderColor: token("hairline"),
  // The widget toolbar (CSV export on the grid and pivot, CSV + PNG on charts) as one of the
  // console's pills: hairline outline, ink icons, mist on hover. globals.css keeps it on screen.
  studioWidgetToolbarBorder: line("hairline"),
  studioWidgetToolbarShadow: false,
  studioWidgetToolbarButtonColor: token("ink"),
  studioWidgetToolbarButtonHoverBackgroundColor: token("mist"),
  studioWidgetToolbarHeight: 32,

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

  // One palette for every built-in chart, in series order: ink, slate and grey for the parts of
  // Ringfence that caught fraud, then coral for what got through (insights-data.ts orders its rows,
  // and so each chart's series, to match). A chart with one or two series reads ink, then slate.
  chartPaletteFills1Color: token("ink"),
  chartPaletteFills2Color: token("slate"),
  chartPaletteFills3Color: token("star-grey"),
  chartPaletteFills4Color: token("spark"),
  chartPaletteFills5Color: token("mist"),
  chartFontFamily: "var(--font-sans)",
  chartTextColor: token("ink"),
  chartSubtleTextColor: token("slate"),
  chartAxisLineColor: token("hairline"),
  chartGridLineColor: token("hairline"),
});
