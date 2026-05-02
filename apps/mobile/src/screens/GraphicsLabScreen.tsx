import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions
} from "react-native";
import { WebView } from "react-native-webview";
import {
  Axis2D,
  Grid2D,
  Interaction2D,
  Scene2D,
  analyzeExprOnInterval,
  compileFunctionExpression,
  parseExpression,
  plotFunctionExpression
} from "@vm/graphics";

import { AppButton } from "../components/ui/AppButton";
import { Screen } from "../components/ui/Screen";
import { ScreenHeader } from "../components/ui/ScreenHeader";
import { SectionCard } from "../components/ui/SectionCard";
import type { AppTheme } from "../theme";

type GraphicsLabScreenProps = {
  theme: AppTheme;
};

type MetricState = {
  cameraX: string;
  cameraY: string;
  range: string;
  zeros: string;
  discontinuities: string;
  minimum: string;
  maximum: string;
  mode: string;
  domain: string;
};

const EXAMPLES = ["sin(x)", "x^2", "x^2/8 - 3", "3/x", "abs(x) - 4", "cos(x) + x/3"];

function round2(value: number): number {
  return Number(value.toFixed(2));
}

function uniqueRounded(values: number[], digits = 2): number[] {
  const out: number[] = [];
  const seen = new Set<string>();

  for (const value of values) {
    const rounded = Number(value.toFixed(digits));
    const key = rounded.toFixed(digits);
    if (!seen.has(key)) {
      seen.add(key);
      out.push(rounded);
    }
  }

  return out;
}

function percentile(sorted: number[], p: number): number | null {
  if (sorted.length === 0) return null;
  const index = (sorted.length - 1) * p;
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  if (lower === upper) return sorted[lower];
  const t = index - lower;
  return sorted[lower] * (1 - t) + sorted[upper] * t;
}

function sampleFunction(
  fn: (x: number) => number,
  xMin: number,
  xMax: number,
  samples = 2200
) {
  const step = (xMax - xMin) / samples;
  const points: Array<{ x: number; y: number }> = [];
  const breaks: number[] = [];
  const zeros: number[] = [];
  let prevX: number | null = null;
  let prevY: number | null = null;

  for (let i = 0; i <= samples; i += 1) {
    const x = xMin + i * step;
    const y = fn(x);

    if (!Number.isFinite(y)) {
      breaks.push(x);
      prevX = null;
      prevY = null;
      continue;
    }

    points.push({ x, y });

    if (prevY !== null && prevX !== null && ((prevY <= 0 && y >= 0) || (prevY >= 0 && y <= 0))) {
      const denom = Math.abs(prevY) + Math.abs(y);
      zeros.push(denom === 0 ? x : (prevX * Math.abs(y) + x * Math.abs(prevY)) / denom);
    }

    prevX = x;
    prevY = y;
  }

  return {
    points,
    zeros: uniqueRounded(zeros),
    breaks: uniqueRounded(breaks)
  };
}

function formatPoint(point: { x: number; y: number } | null): string {
  if (!point) return "-";
  return `x ≈ ${point.x.toFixed(3)}, y ≈ ${point.y.toFixed(3)}`;
}

function buildFallbackHtml(theme: AppTheme): string {
  return `<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1" />
<style>
html,body{margin:0;height:100%;font-family:system-ui;background:${theme.colors.surface};color:${theme.colors.text}}
body{display:flex;align-items:center;justify-content:center;padding:24px;text-align:center}
.box{max-width:520px;border:1px solid ${theme.colors.border};border-radius:8px;padding:18px}
h1{font-size:22px;margin:0 0 10px}p{font-size:15px;line-height:1.5;color:${theme.colors.textSecondary}}
</style></head><body><div class="box"><h1>VM Graphics</h1><p>Полная интерактивная студия доступна в web-версии сайта. Нативный экран можно расширить отдельной WebView-сборкой библиотеки.</p></div></body></html>`;
}

export function GraphicsLabScreen({ theme }: GraphicsLabScreenProps) {
  const { width } = useWindowDimensions();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [draftExpression, setDraftExpression] = useState("sin(x)");
  const [expression, setExpression] = useState("sin(x)");
  const [reloadKey, setReloadKey] = useState(0);
  const [error, setError] = useState("");
  const [metrics, setMetrics] = useState<MetricState>({
    cameraX: "-",
    cameraY: "-",
    range: "-",
    zeros: "-",
    discontinuities: "-",
    minimum: "-",
    maximum: "-",
    mode: "-",
    domain: "-"
  });
  const styles = createStyles(theme, width);
  const fallbackHtml = useMemo(() => buildFallbackHtml(theme), [theme]);

  useEffect(() => {
    if (Platform.OS !== "web") return;

    const activeCanvas = canvasRef.current;
    if (!activeCanvas) return;

    const activeContext = activeCanvas.getContext("2d");
    if (!activeContext) return;

    const canvas: HTMLCanvasElement = activeCanvas;
    const context: CanvasRenderingContext2D = activeContext;

    function syncCanvasSize() {
      const rect = canvas.getBoundingClientRect();
      canvas.width = Math.max(360, Math.floor(rect.width));
      canvas.height = Math.max(420, Math.floor(rect.height));
    }

    const scene = new Scene2D({
      background: "#ffffff",
      camera: { x: 0, y: 0, zoom: 30, minZoom: 0.05, maxZoom: 400 }
    });

    scene
      .add(new Grid2D({ id: "grid", step: 1, extent: 100, strokeStyle: "#eceff4", lineWidth: 0.8 }))
      .add(new Axis2D({ id: "axis", extent: 100, strokeStyle: "#111827", lineWidth: 2, tickStep: 1, showLabels: true }));

    function getVisibleBounds() {
      const topLeft = scene.camera.screenToWorld({ x: 0, y: 0 }, canvas.width, canvas.height);
      const bottomRight = scene.camera.screenToWorld(
        { x: canvas.width, y: canvas.height },
        canvas.width,
        canvas.height
      );

      return {
        minX: Math.min(topLeft.x, bottomRight.x),
        maxX: Math.max(topLeft.x, bottomRight.x),
        minY: Math.min(topLeft.y, bottomRight.y),
        maxY: Math.max(topLeft.y, bottomRight.y)
      };
    }

    function computeStableAutoFitBounds(fn: (x: number) => number) {
      const fitXMin = -10;
      const fitXMax = 10;
      const { points } = sampleFunction(fn, fitXMin, fitXMax, 2600);

      if (points.length === 0) {
        return { minX: -10, maxX: 10, minY: -10, maxY: 10 };
      }

      const yValues = points.map((point) => point.y).sort((a, b) => a - b);
      let low = percentile(yValues, 0.05);
      let high = percentile(yValues, 0.95);

      if (low === null || high === null || Math.abs(high - low) < 1e-6) {
        low = -10;
        high = 10;
      }

      const padY = Math.max((high - low) * 0.2, 1);

      return {
        minX: fitXMin,
        maxX: fitXMax,
        minY: low - padY,
        maxY: high + padY
      };
    }

    function analyzeWindow(fn: (x: number) => number, xMin: number, xMax: number) {
      const sampled = sampleFunction(fn, xMin, xMax, 2200);
      let minPoint = sampled.points[0] ?? null;
      let maxPoint = sampled.points[0] ?? null;

      for (const point of sampled.points) {
        if (minPoint && point.y < minPoint.y) minPoint = point;
        if (maxPoint && point.y > maxPoint.y) maxPoint = point;
      }

      return { ...sampled, minPoint, maxPoint };
    }

    function updateMetrics(bounds: ReturnType<typeof getVisibleBounds>, fn: (x: number) => number) {
      const numeric = analyzeWindow(fn, bounds.minX, bounds.maxX);
      let mode = "численный";
      let domain = "по текущему окну";

      try {
        const exact = analyzeExprOnInterval(parseExpression(expression), bounds.minX, bounds.maxX);
        mode = exact.modeText;
        domain = exact.domainText;
      } catch {}

      setMetrics({
        cameraX: `[${round2(bounds.minX)}, ${round2(bounds.maxX)}]`,
        cameraY: `[${round2(bounds.minY)}, ${round2(bounds.maxY)}]`,
        range:
          numeric.minPoint && numeric.maxPoint
            ? `[${numeric.minPoint.y.toFixed(3)}, ${numeric.maxPoint.y.toFixed(3)}]`
            : "не удалось оценить",
        zeros: numeric.zeros.length ? numeric.zeros.slice(0, 8).map((x) => x.toFixed(2)).join(", ") : "не найдены",
        discontinuities: numeric.breaks.length
          ? numeric.breaks.slice(0, 8).map((x) => `x ≈ ${x.toFixed(2)}`).join(", ")
          : "не обнаружены",
        minimum: formatPoint(numeric.minPoint),
        maximum: formatPoint(numeric.maxPoint),
        mode,
        domain
      });
    }

    function render() {
      try {
        syncCanvasSize();
        scene.objects = scene.objects.filter((object) => object.id === "grid" || object.id === "axis");
        const bounds = getVisibleBounds();
        const fn = compileFunctionExpression(expression);

        scene.add(
          plotFunctionExpression({
            id: "user-graph",
            expression,
            xMin: bounds.minX,
            xMax: bounds.maxX,
            samples: Math.max(1200, Math.floor(canvas.width * 1.5)),
            strokeStyle: "#2563eb",
            lineWidth: 2,
            breakOnDiscontinuity: true,
            discontinuityThreshold: 8
          })
        );

        scene.render(context);
        updateMetrics(bounds, fn);
        setError("");
      } catch {
        setError("Не удалось построить выражение. Проверь синтаксис функции.");
      }
    }

    function autoFit() {
      const fn = compileFunctionExpression(expression);
      const bounds = computeStableAutoFitBounds(fn);
      scene.camera.fitToBounds(bounds, canvas.width, canvas.height, 70);
    }

    const interaction = new Interaction2D(canvas, scene, { onChange: render });
    interaction.attach();

    syncCanvasSize();
    autoFit();
    render();

    window.addEventListener("resize", render);

    return () => {
      window.removeEventListener("resize", render);
      interaction.detach();
    };
  }, [expression, reloadKey]);

  function handlePlot() {
    setExpression(draftExpression.trim() || "sin(x)");
  }

  function handleExample(nextExpression: string) {
    setDraftExpression(nextExpression);
    setExpression(nextExpression);
  }

  return (
    <Screen theme={theme}>
      <ScreenHeader
        theme={theme}
        title="Графическая студия"
        subtitle="Интерактивная студия VM Graphics из ветки nver/graphics-init"
        rightSlot={
          <AppButton
            label="Обновить"
            onPress={() => setReloadKey((current) => current + 1)}
            theme={theme}
            variant="secondary"
            fullWidth={false}
            style={styles.reloadButton}
          />
        }
      />

      <SectionCard
        theme={theme}
        title="VM Graphics"
        subtitle="Построение функций, auto-fit, панорамирование, зум и анализ окна работают на библиотеке Нвера."
      >
        <View style={styles.toolbar}>
          <Text style={styles.inputLabel}>f(x) =</Text>
          <TextInput
            value={draftExpression}
            onChangeText={setDraftExpression}
            onSubmitEditing={handlePlot}
            placeholder="sin(x)"
            placeholderTextColor={theme.colors.textSecondary}
            style={styles.input}
            autoCapitalize="none"
            autoCorrect={false}
          />
          <AppButton
            label="Построить"
            onPress={handlePlot}
            theme={theme}
            fullWidth={false}
            style={styles.toolbarButton}
          />
          <AppButton
            label="Auto Fit"
            onPress={() => setReloadKey((current) => current + 1)}
            theme={theme}
            variant="secondary"
            fullWidth={false}
            style={styles.toolbarButton}
          />
        </View>

        <View style={styles.examplesRow}>
          {EXAMPLES.map((example) => (
            <Pressable key={example} onPress={() => handleExample(example)} style={styles.exampleChip}>
              <Text style={styles.exampleText}>{example}</Text>
            </Pressable>
          ))}
        </View>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <View style={styles.workspace}>
          <View style={styles.canvasFrame}>
            {Platform.OS === "web" ? (
              React.createElement("canvas", {
                ref: canvasRef,
                style: styles.canvas as unknown as React.CSSProperties
              })
            ) : (
              <WebView
                originWhitelist={["*"]}
                source={{ html: fallbackHtml }}
                javaScriptEnabled
                scrollEnabled={false}
                style={styles.webView}
              />
            )}
          </View>

          <View style={styles.infoPanel}>
            <Text style={styles.infoTitle}>Информация</Text>
            <Metric label="Функция" value={expression} styles={styles} />
            <Metric label="Режим анализа" value={metrics.mode} styles={styles} />
            <Metric label="Область определения" value={metrics.domain} styles={styles} />
            <Metric label="Диапазон камеры по X" value={metrics.cameraX} styles={styles} />
            <Metric label="Диапазон камеры по Y" value={metrics.cameraY} styles={styles} />
            <Metric label="Значения на окне" value={metrics.range} styles={styles} />
            <Metric label="Примерные нули" value={metrics.zeros} styles={styles} />
            <Metric label="Точки разрыва" value={metrics.discontinuities} styles={styles} />
            <Metric label="Минимум на окне" value={metrics.minimum} styles={styles} />
            <Metric label="Максимум на окне" value={metrics.maximum} styles={styles} />
          </View>
        </View>
      </SectionCard>
    </Screen>
  );
}

function Metric({
  label,
  value,
  styles
}: {
  label: string;
  value: string;
  styles: ReturnType<typeof createStyles>;
}) {
  return (
    <View style={styles.metric}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
    </View>
  );
}

function createStyles(theme: AppTheme, width: number) {
  const isCompact = width < 900;

  return StyleSheet.create({
    reloadButton: {
      minWidth: 118
    },
    toolbar: {
      flexDirection: isCompact ? "column" : "row",
      alignItems: isCompact ? "stretch" : "center",
      gap: theme.spacing.sm,
      marginBottom: theme.spacing.sm
    },
    inputLabel: {
      color: theme.colors.textSecondary,
      fontSize: theme.typography.body,
      fontWeight: "800"
    },
    input: {
      flex: 1,
      minHeight: 46,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.input,
      color: theme.colors.text,
      paddingHorizontal: theme.spacing.md,
      fontSize: theme.typography.body
    },
    toolbarButton: {
      minWidth: 118,
      alignSelf: isCompact ? "stretch" : "center"
    },
    examplesRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: theme.spacing.xs,
      marginBottom: theme.spacing.md
    },
    exampleChip: {
      minHeight: 32,
      justifyContent: "center",
      borderRadius: 8,
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.surfaceMuted,
      paddingHorizontal: theme.spacing.sm
    },
    exampleText: {
      color: theme.colors.text,
      fontSize: theme.typography.caption,
      fontWeight: "700"
    },
    errorText: {
      color: theme.colors.danger,
      fontSize: theme.typography.body,
      fontWeight: "700",
      marginBottom: theme.spacing.md
    },
    workspace: {
      flexDirection: isCompact ? "column" : "row",
      gap: theme.spacing.md,
      alignItems: "stretch"
    },
    canvasFrame: {
      flex: 1,
      minHeight: isCompact ? 520 : 720,
      overflow: "hidden",
      borderRadius: 8,
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: "#ffffff"
    },
    canvas: {
      width: "100%",
      height: isCompact ? 520 : 720,
      backgroundColor: "#ffffff",
      cursor: "grab",
      touchAction: "none"
    } as unknown as object,
    webView: {
      flex: 1,
      backgroundColor: theme.colors.surface
    },
    infoPanel: {
      width: isCompact ? "100%" : 320,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.surface,
      padding: theme.spacing.md
    },
    infoTitle: {
      color: theme.colors.text,
      fontSize: theme.typography.sectionTitle,
      fontWeight: "800",
      marginBottom: theme.spacing.sm
    },
    metric: {
      borderTopWidth: 1,
      borderTopColor: theme.colors.border,
      paddingVertical: theme.spacing.sm
    },
    metricLabel: {
      color: theme.colors.textSecondary,
      fontSize: theme.typography.caption,
      fontWeight: "800",
      marginBottom: 4
    },
    metricValue: {
      color: theme.colors.text,
      fontSize: theme.typography.body,
      fontWeight: "600",
      lineHeight: 21
    }
  });
}
