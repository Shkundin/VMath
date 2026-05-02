import React, { useMemo, useState } from "react";
import { Platform, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { WebView } from "react-native-webview";
import { analyzeExprOnInterval, parseExpression } from "@vm/graphics";

import { AppButton } from "../components/ui/AppButton";
import { Screen } from "../components/ui/Screen";
import { ScreenHeader } from "../components/ui/ScreenHeader";
import { SectionCard } from "../components/ui/SectionCard";
import type { AppTheme } from "../theme";

type GraphicsLabScreenProps = {
  theme: AppTheme;
};

function buildGraphicsHtml(theme: AppTheme, width: number): string {
  const isCompact = width < 760;
  const canvasHeight = isCompact ? 520 : 680;

  return `<!doctype html>
<html lang="ru">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
    <style>
      * { box-sizing: border-box; }
      html, body {
        margin: 0;
        padding: 0;
        width: 100%;
        min-height: 100%;
        background: ${theme.colors.surface};
        color: ${theme.colors.text};
        font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        overflow: hidden;
      }
      body {
        padding: ${isCompact ? 10 : 14}px;
      }
      .shell {
        display: grid;
        grid-template-columns: ${isCompact ? "1fr" : "minmax(0, 1fr) 292px"};
        gap: 12px;
        width: 100%;
      }
      .toolbar, .graph, .info {
        border: 1px solid ${theme.colors.border};
        background: ${theme.colors.surface};
        border-radius: 8px;
      }
      .toolbar {
        grid-column: 1 / -1;
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 10px;
        padding: 10px;
      }
      label {
        font-size: 13px;
        font-weight: 800;
        color: ${theme.colors.textSecondary};
      }
      input {
        flex: 1 1 240px;
        min-width: 0;
        height: 44px;
        border: 1px solid ${theme.colors.border};
        border-radius: 8px;
        padding: 0 12px;
        background: ${theme.colors.input};
        color: ${theme.colors.text};
        font-size: 16px;
        outline: none;
      }
      button {
        height: 44px;
        border: 1px solid ${theme.colors.primary};
        border-radius: 8px;
        padding: 0 14px;
        background: ${theme.colors.primary};
        color: #ffffff;
        font-size: 14px;
        font-weight: 800;
        cursor: pointer;
      }
      button.secondary {
        background: ${theme.colors.surface};
        color: ${theme.colors.text};
        border-color: ${theme.colors.border};
      }
      .examples {
        flex-basis: 100%;
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
      }
      .example {
        min-height: 30px;
        border-radius: 8px;
        border: 1px solid ${theme.colors.border};
        background: ${theme.colors.surfaceMuted};
        color: ${theme.colors.text};
        padding: 0 9px;
        font-size: 13px;
      }
      .graph {
        overflow: hidden;
      }
      canvas {
        display: block;
        width: 100%;
        height: ${canvasHeight}px;
        background: #ffffff;
        touch-action: none;
      }
      .info {
        padding: 12px;
      }
      .info h2 {
        margin: 0 0 12px;
        font-size: 18px;
        line-height: 1.2;
      }
      .metric {
        padding: 10px 0;
        border-top: 1px solid ${theme.colors.border};
      }
      .metric:first-of-type {
        border-top: 0;
      }
      .metric-label {
        margin-bottom: 4px;
        color: ${theme.colors.textSecondary};
        font-size: 12px;
        font-weight: 800;
      }
      .metric-value {
        color: ${theme.colors.text};
        font-size: 14px;
        line-height: 1.35;
        word-break: break-word;
      }
      .error {
        display: none;
        grid-column: 1 / -1;
        border: 1px solid ${theme.colors.danger};
        border-radius: 8px;
        padding: 10px 12px;
        color: ${theme.colors.danger};
        background: rgba(220, 38, 38, 0.08);
        font-size: 14px;
        font-weight: 700;
      }
    </style>
  </head>
  <body>
    <div class="shell">
      <div class="toolbar">
        <label for="expr">f(x)</label>
        <input id="expr" value="sin(x)" autocomplete="off" />
        <button id="plot">Построить</button>
        <button id="fit" class="secondary">Auto Fit</button>
        <button id="reset" class="secondary">Сброс</button>
        <div class="examples" id="examples"></div>
      </div>
      <div class="error" id="error"></div>
      <div class="graph">
        <canvas id="canvas"></canvas>
      </div>
      <aside class="info">
        <h2>Анализ функции</h2>
        <div class="metric">
          <div class="metric-label">Функция</div>
          <div class="metric-value" id="infoExpr">sin(x)</div>
        </div>
        <div class="metric">
          <div class="metric-label">Окно по X</div>
          <div class="metric-value" id="infoCameraX">-</div>
        </div>
        <div class="metric">
          <div class="metric-label">Окно по Y</div>
          <div class="metric-value" id="infoCameraY">-</div>
        </div>
        <div class="metric">
          <div class="metric-label">Значения на окне</div>
          <div class="metric-value" id="infoRange">-</div>
        </div>
        <div class="metric">
          <div class="metric-label">Нули</div>
          <div class="metric-value" id="infoZeros">-</div>
        </div>
        <div class="metric">
          <div class="metric-label">Особые точки</div>
          <div class="metric-value" id="infoBreaks">-</div>
        </div>
        <div class="metric">
          <div class="metric-label">Минимум</div>
          <div class="metric-value" id="infoMin">-</div>
        </div>
        <div class="metric">
          <div class="metric-label">Максимум</div>
          <div class="metric-value" id="infoMax">-</div>
        </div>
      </aside>
    </div>
    <script>
      const canvas = document.getElementById("canvas");
      const context = canvas.getContext("2d");
      const exprInput = document.getElementById("expr");
      const plotButton = document.getElementById("plot");
      const fitButton = document.getElementById("fit");
      const resetButton = document.getElementById("reset");
      const examples = document.getElementById("examples");
      const errorBox = document.getElementById("error");
      const infoExpr = document.getElementById("infoExpr");
      const infoCameraX = document.getElementById("infoCameraX");
      const infoCameraY = document.getElementById("infoCameraY");
      const infoRange = document.getElementById("infoRange");
      const infoZeros = document.getElementById("infoZeros");
      const infoBreaks = document.getElementById("infoBreaks");
      const infoMin = document.getElementById("infoMin");
      const infoMax = document.getElementById("infoMax");
      const palette = ["#2563eb", "#dc2626", "#16a34a", "#7c3aed"];
      const sampleExpressions = ["sin(x)", "x^2/8 - 3", "3/x", "abs(x) - 4", "cos(x) + x/3"];
      let expression = "sin(x)";
      let camera = { x: 0, y: 0, zoom: 34, minZoom: 8, maxZoom: 260 };
      let pointer = null;
      let rafId = null;

      function resizeCanvas() {
        const rect = canvas.getBoundingClientRect();
        const ratio = window.devicePixelRatio || 1;
        canvas.width = Math.max(320, Math.floor(rect.width * ratio));
        canvas.height = Math.max(360, Math.floor(rect.height * ratio));
        context.setTransform(ratio, 0, 0, ratio, 0, 0);
      }

      function canvasSize() {
        const rect = canvas.getBoundingClientRect();
        return { width: rect.width, height: rect.height };
      }

      function worldToScreen(point) {
        const size = canvasSize();
        return {
          x: size.width / 2 + (point.x - camera.x) * camera.zoom,
          y: size.height / 2 - (point.y - camera.y) * camera.zoom
        };
      }

      function screenToWorld(point) {
        const size = canvasSize();
        return {
          x: camera.x + (point.x - size.width / 2) / camera.zoom,
          y: camera.y - (point.y - size.height / 2) / camera.zoom
        };
      }

      function getBounds() {
        const size = canvasSize();
        const a = screenToWorld({ x: 0, y: 0 });
        const b = screenToWorld({ x: size.width, y: size.height });
        return {
          minX: Math.min(a.x, b.x),
          maxX: Math.max(a.x, b.x),
          minY: Math.min(a.y, b.y),
          maxY: Math.max(a.y, b.y)
        };
      }

      function compileFunction(value) {
        const normalized = value
          .replace(/\\^/g, "**")
          .replace(/\\babs\\(/g, "Math.abs(")
          .replace(/\\bsin\\(/g, "Math.sin(")
          .replace(/\\bcos\\(/g, "Math.cos(")
          .replace(/\\btan\\(/g, "Math.tan(")
          .replace(/\\bsqrt\\(/g, "Math.sqrt(")
          .replace(/\\blog\\(/g, "Math.log(")
          .replace(/\\bexp\\(/g, "Math.exp(")
          .replace(/\\bPI\\b/g, "Math.PI")
          .replace(/\\bE\\b/g, "Math.E");
        return new Function("x", "return " + normalized + ";");
      }

      function round(value, digits) {
        return Number(value.toFixed(digits));
      }

      function uniqueRounded(values, digits) {
        const seen = new Set();
        const result = [];
        for (const value of values) {
          const rounded = round(value, digits);
          const key = rounded.toFixed(digits);
          if (!seen.has(key)) {
            seen.add(key);
            result.push(rounded);
          }
        }
        return result;
      }

      function sample(fn, xMin, xMax, samples) {
        const points = [];
        const zeros = [];
        const breaks = [];
        const step = (xMax - xMin) / samples;
        let prev = null;
        for (let index = 0; index <= samples; index += 1) {
          const x = xMin + step * index;
          const y = fn(x);
          if (!Number.isFinite(y) || Math.abs(y) > 1e6) {
            breaks.push(x);
            prev = null;
            continue;
          }
          if (prev && ((prev.y <= 0 && y >= 0) || (prev.y >= 0 && y <= 0))) {
            const denom = Math.abs(prev.y) + Math.abs(y);
            zeros.push(denom === 0 ? x : (prev.x * Math.abs(y) + x * Math.abs(prev.y)) / denom);
          }
          points.push({ x, y });
          prev = { x, y };
        }
        return { points, zeros: uniqueRounded(zeros, 2), breaks: uniqueRounded(breaks, 2) };
      }

      function analyze(fn, bounds) {
        const sampled = sample(fn, bounds.minX, bounds.maxX, 1800);
        let minPoint = null;
        let maxPoint = null;
        for (const point of sampled.points) {
          if (!minPoint || point.y < minPoint.y) minPoint = point;
          if (!maxPoint || point.y > maxPoint.y) maxPoint = point;
        }
        return { ...sampled, minPoint, maxPoint };
      }

      function percentile(values, p) {
        if (!values.length) return null;
        const sorted = values.slice().sort((a, b) => a - b);
        const index = (sorted.length - 1) * p;
        const lower = Math.floor(index);
        const upper = Math.ceil(index);
        if (lower === upper) return sorted[lower];
        const t = index - lower;
        return sorted[lower] * (1 - t) + sorted[upper] * t;
      }

      function autoFit() {
        const fn = compileFunction(expression);
        const sampled = sample(fn, -10, 10, 2200);
        const ys = sampled.points.map((point) => point.y).filter(Number.isFinite);
        let low = percentile(ys, 0.05);
        let high = percentile(ys, 0.95);
        if (low === null || high === null || Math.abs(high - low) < 1e-6) {
          low = -5;
          high = 5;
        }
        const size = canvasSize();
        const padY = Math.max((high - low) * 0.18, 1);
        const spanX = 20;
        const spanY = high - low + padY * 2;
        camera.x = 0;
        camera.y = (low + high) / 2;
        camera.zoom = Math.max(camera.minZoom, Math.min(camera.maxZoom, Math.min(size.width / spanX, size.height / spanY)));
      }

      function drawGrid(bounds) {
        const size = canvasSize();
        context.clearRect(0, 0, size.width, size.height);
        context.fillStyle = "#ffffff";
        context.fillRect(0, 0, size.width, size.height);
        const step = camera.zoom < 18 ? 5 : camera.zoom < 42 ? 2 : 1;
        const startX = Math.floor(bounds.minX / step) * step;
        const startY = Math.floor(bounds.minY / step) * step;
        context.strokeStyle = "#e5e7eb";
        context.lineWidth = 1;
        for (let x = startX; x <= bounds.maxX; x += step) {
          const p = worldToScreen({ x, y: 0 });
          context.beginPath();
          context.moveTo(p.x, 0);
          context.lineTo(p.x, size.height);
          context.stroke();
        }
        for (let y = startY; y <= bounds.maxY; y += step) {
          const p = worldToScreen({ x: 0, y });
          context.beginPath();
          context.moveTo(0, p.y);
          context.lineTo(size.width, p.y);
          context.stroke();
        }
        context.strokeStyle = "#111827";
        context.lineWidth = 2;
        if (bounds.minY <= 0 && bounds.maxY >= 0) {
          const p = worldToScreen({ x: 0, y: 0 });
          context.beginPath();
          context.moveTo(0, p.y);
          context.lineTo(size.width, p.y);
          context.stroke();
        }
        if (bounds.minX <= 0 && bounds.maxX >= 0) {
          const p = worldToScreen({ x: 0, y: 0 });
          context.beginPath();
          context.moveTo(p.x, 0);
          context.lineTo(p.x, size.height);
          context.stroke();
        }
      }

      function drawGraph(fn, bounds) {
        const sampled = sample(fn, bounds.minX, bounds.maxX, Math.max(900, Math.floor(canvasSize().width * 2)));
        context.strokeStyle = palette[0];
        context.lineWidth = 2.5;
        context.beginPath();
        let started = false;
        let previousY = null;
        for (const point of sampled.points) {
          if (previousY !== null && Math.abs(point.y - previousY) > 30) {
            started = false;
          }
          const screen = worldToScreen(point);
          if (!started) {
            context.moveTo(screen.x, screen.y);
            started = true;
          } else {
            context.lineTo(screen.x, screen.y);
          }
          previousY = point.y;
        }
        context.stroke();
      }

      function updateInfo(bounds, analysis) {
        infoExpr.textContent = expression;
        infoCameraX.textContent = "[" + round(bounds.minX, 2) + "; " + round(bounds.maxX, 2) + "]";
        infoCameraY.textContent = "[" + round(bounds.minY, 2) + "; " + round(bounds.maxY, 2) + "]";
        infoRange.textContent = analysis.minPoint && analysis.maxPoint
          ? "[" + analysis.minPoint.y.toFixed(3) + "; " + analysis.maxPoint.y.toFixed(3) + "]"
          : "Не удалось оценить";
        infoZeros.textContent = analysis.zeros.length ? analysis.zeros.slice(0, 8).join(", ") : "Не найдены";
        infoBreaks.textContent = analysis.breaks.length ? analysis.breaks.slice(0, 8).map((x) => "x≈" + x).join(", ") : "Не обнаружены";
        infoMin.textContent = analysis.minPoint ? "x≈" + analysis.minPoint.x.toFixed(3) + ", y≈" + analysis.minPoint.y.toFixed(3) : "-";
        infoMax.textContent = analysis.maxPoint ? "x≈" + analysis.maxPoint.x.toFixed(3) + ", y≈" + analysis.maxPoint.y.toFixed(3) : "-";
      }

      function showError(message) {
        errorBox.style.display = message ? "block" : "none";
        errorBox.textContent = message || "";
      }

      function render() {
        try {
          const fn = compileFunction(expression);
          const bounds = getBounds();
          drawGrid(bounds);
          drawGraph(fn, bounds);
          updateInfo(bounds, analyze(fn, bounds));
          showError("");
        } catch (error) {
          showError("Не удалось построить выражение. Проверь синтаксис функции.");
        }
      }

      function requestRender() {
        if (rafId !== null) return;
        rafId = requestAnimationFrame(() => {
          rafId = null;
          render();
        });
      }

      function applyExpression(value, fit) {
        expression = value.trim() || "sin(x)";
        exprInput.value = expression;
        compileFunction(expression)(1);
        if (fit) autoFit();
        render();
      }

      sampleExpressions.forEach((value) => {
        const button = document.createElement("button");
        button.className = "example";
        button.textContent = value;
        button.addEventListener("click", () => applyExpression(value, true));
        examples.appendChild(button);
      });

      plotButton.addEventListener("click", () => {
        try {
          applyExpression(exprInput.value, true);
        } catch {
          showError("Не удалось построить выражение. Примеры: sin(x), x^2, 3/x, abs(x)-4.");
        }
      });

      fitButton.addEventListener("click", () => {
        try {
          expression = exprInput.value.trim() || expression;
          autoFit();
          render();
        } catch {
          showError("Auto Fit недоступен для текущего выражения.");
        }
      });

      resetButton.addEventListener("click", () => {
        camera = { x: 0, y: 0, zoom: 34, minZoom: 8, maxZoom: 260 };
        render();
      });

      exprInput.addEventListener("keydown", (event) => {
        if (event.key === "Enter") plotButton.click();
      });

      canvas.addEventListener("pointerdown", (event) => {
        canvas.setPointerCapture(event.pointerId);
        pointer = { id: event.pointerId, x: event.clientX, y: event.clientY, cameraX: camera.x, cameraY: camera.y };
      });

      canvas.addEventListener("pointermove", (event) => {
        if (!pointer || pointer.id !== event.pointerId) return;
        camera.x = pointer.cameraX - (event.clientX - pointer.x) / camera.zoom;
        camera.y = pointer.cameraY + (event.clientY - pointer.y) / camera.zoom;
        requestRender();
      });

      canvas.addEventListener("pointerup", () => {
        pointer = null;
      });

      canvas.addEventListener("wheel", (event) => {
        event.preventDefault();
        const rect = canvas.getBoundingClientRect();
        const before = screenToWorld({ x: event.clientX - rect.left, y: event.clientY - rect.top });
        const factor = event.deltaY > 0 ? 0.9 : 1.1;
        camera.zoom = Math.max(camera.minZoom, Math.min(camera.maxZoom, camera.zoom * factor));
        const after = screenToWorld({ x: event.clientX - rect.left, y: event.clientY - rect.top });
        camera.x += before.x - after.x;
        camera.y += before.y - after.y;
        requestRender();
      }, { passive: false });

      window.addEventListener("resize", () => {
        resizeCanvas();
        requestRender();
      });

      resizeCanvas();
      autoFit();
      render();
    </script>
  </body>
</html>`;
}

export function GraphicsLabScreen({ theme }: GraphicsLabScreenProps) {
  const { width } = useWindowDimensions();
  const [reloadKey, setReloadKey] = useState(0);
  const engineSummary = useMemo(() => {
    try {
      const expression = "x^2/8 - 3";
      const analysis = analyzeExprOnInterval(parseExpression(expression), -10, 10);

      return {
        expression,
        mode: analysis.mode === "exact" ? "точный" : analysis.mode === "numeric" ? "численный" : "гибридный",
        zeros: analysis.zeros.length ? analysis.zeros.map((value) => Number(value.toFixed(3))).join(", ") : "не найдены",
        extremum: analysis.minimum
          ? `min (${Number(analysis.minimum.x.toFixed(3))}; ${Number(analysis.minimum.y.toFixed(3))})`
          : analysis.maximum
            ? `max (${Number(analysis.maximum.x.toFixed(3))}; ${Number(analysis.maximum.y.toFixed(3))})`
            : "не найден"
      };
    } catch {
      return null;
    }
  }, []);
  const html = useMemo(() => buildGraphicsHtml(theme, width), [theme, width, reloadKey]);
  const styles = createStyles(theme, width);

  return (
    <Screen theme={theme}>
      <ScreenHeader
        theme={theme}
        title="Графическая студия"
        subtitle="Интерактивное построение функций на базе VM Graphics"
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
        title="Построение и анализ"
        subtitle="Введите выражение, выберите пример или двигайте координатную плоскость внутри области графика."
      >
        {engineSummary ? (
          <View style={styles.engineStrip}>
            <View style={styles.engineItem}>
              <Text style={styles.engineLabel}>Движок</Text>
              <Text style={styles.engineValue}>@vm/graphics</Text>
            </View>
            <View style={styles.engineItem}>
              <Text style={styles.engineLabel}>Проверка</Text>
              <Text style={styles.engineValue}>{engineSummary.expression}</Text>
            </View>
            <View style={styles.engineItem}>
              <Text style={styles.engineLabel}>Режим</Text>
              <Text style={styles.engineValue}>{engineSummary.mode}</Text>
            </View>
            <View style={styles.engineItem}>
              <Text style={styles.engineLabel}>Нули</Text>
              <Text style={styles.engineValue}>{engineSummary.zeros}</Text>
            </View>
            <View style={styles.engineItem}>
              <Text style={styles.engineLabel}>Экстремум</Text>
              <Text style={styles.engineValue}>{engineSummary.extremum}</Text>
            </View>
          </View>
        ) : null}

        <View style={styles.webViewFrame}>
          {Platform.OS === "web" ? (
            <iframe
              key={reloadKey}
              title="VM Graphics"
              srcDoc={html}
              style={styles.iframe}
            />
          ) : (
            <WebView
              key={reloadKey}
              originWhitelist={["*"]}
              source={{ html }}
              javaScriptEnabled
              domStorageEnabled
              scrollEnabled={false}
              nestedScrollEnabled
              showsHorizontalScrollIndicator={false}
              showsVerticalScrollIndicator={false}
              style={styles.webView}
            />
          )}
        </View>
      </SectionCard>
    </Screen>
  );
}

function createStyles(theme: AppTheme, width: number) {
  const isCompact = width < 760;
  const frameHeight = isCompact ? 950 : 742;

  return StyleSheet.create({
    reloadButton: {
      minWidth: 118
    },
    engineStrip: {
      display: "flex",
      flexDirection: isCompact ? "column" : "row",
      gap: theme.spacing.sm,
      marginBottom: theme.spacing.md
    },
    engineItem: {
      flex: 1,
      minWidth: 0,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.surfaceMuted,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm
    },
    engineLabel: {
      color: theme.colors.textSecondary,
      fontSize: theme.typography.caption,
      fontWeight: "800",
      marginBottom: 3
    },
    engineValue: {
      color: theme.colors.text,
      fontSize: theme.typography.body,
      fontWeight: "700"
    },
    webViewFrame: {
      height: frameHeight,
      width: "100%",
      overflow: "hidden",
      borderRadius: 8,
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.surface
    },
    webView: {
      flex: 1,
      backgroundColor: theme.colors.surface
    },
    iframe: {
      width: "100%",
      height: "100%",
      borderWidth: 0,
      borderStyle: "none",
      backgroundColor: theme.colors.surface
    } as unknown as object,
    fallbackText: {
      color: theme.colors.text
    }
  });
}
