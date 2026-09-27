import { useRef, useEffect } from "react";
import "./CursorGrid.css";

const FALLOFF_CURVES = {
  linear: (t) => 1 - t,

  smooth: (t) => {
    const x = Math.max(0, Math.min(1, t));
    return x * x * (3 - 2 * x);
  },

  sharp: (t) => {
    const x = Math.max(0, Math.min(1, t));
    return Math.pow(1 - x, 4);
  },
};

function hexToRgb(hex) {
  const cleanHex = hex.replace("#", "");

  const value =
    cleanHex.length === 3
      ? cleanHex
          .split("")
          .map((char) => char + char)
          .join("")
      : cleanHex;

  const number = parseInt(value, 16);

  return {
    r: (number >> 16) & 255,
    g: (number >> 8) & 255,
    b: number & 255,
  };
}

export default function CursorGrid({
  cellSize = 70,
  color = "#D946EF",
  radius = 140,
  falloff = "smooth",
  holdTime = 400,
  fadeDuration = 800,
  lineWidth = 1.2,
  maxOpacity = 1,
  fillOpacity = 0,
  gridOpacity = 0,
  cellRadius = 0,
  clickPulse = true,
  pulseSpeed = 600,
  className = "",
}) {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);

  const pointerRef = useRef({
    x: -1000,
    y: -1000,
  });

  const cellsRef = useRef([]);
  const animationRef = useRef(null);

  const pulsesRef = useRef([]);

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;

    if (!container || !canvas) return;

    const ctx = canvas.getContext("2d");

    if (!ctx) return;

    const rgb = hexToRgb(color);

    let width = 0;
    let height = 0;
    let dpr = window.devicePixelRatio || 1;

    const resizeCanvas = () => {
      const rect = container.getBoundingClientRect();

      width = rect.width;
      height = rect.height;
      dpr = window.devicePixelRatio || 1;

      canvas.width = width * dpr;
      canvas.height = height * dpr;

      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      createCells();
    };

    const createCells = () => {
      cellsRef.current = [];

      const columns = Math.ceil(width / cellSize) + 1;
      const rows = Math.ceil(height / cellSize) + 1;

      for (let row = 0; row < rows; row++) {
        for (let column = 0; column < columns; column++) {
          cellsRef.current.push({
            x: column * cellSize,
            y: row * cellSize,
          });
        }
      }
    };

    const getFalloff = (distance) => {
      if (distance >= radius) return 0;

      const normalized = distance / radius;

      const curve =
        FALLOFF_CURVES[falloff] || FALLOFF_CURVES.smooth;

      return curve(normalized);
    };

    const roundRect = (
      context,
      x,
      y,
      widthValue,
      heightValue,
      radiusValue
    ) => {
      const radiusAmount = Math.min(
        radiusValue,
        widthValue / 2,
        heightValue / 2
      );

      context.beginPath();

      context.moveTo(x + radiusAmount, y);

      context.lineTo(
        x + widthValue - radiusAmount,
        y
      );

      context.quadraticCurveTo(
        x + widthValue,
        y,
        x + widthValue,
        y + radiusAmount
      );

      context.lineTo(
        x + widthValue,
        y + heightValue - radiusAmount
      );

      context.quadraticCurveTo(
        x + widthValue,
        y + heightValue,
        x + widthValue - radiusAmount,
        y + heightValue
      );

      context.lineTo(
        x + radiusAmount,
        y + heightValue
      );

      context.quadraticCurveTo(
        x,
        y + heightValue,
        x,
        y + heightValue - radiusAmount
      );

      context.lineTo(x, y + radiusAmount);

      context.quadraticCurveTo(
        x,
        y,
        x + radiusAmount,
        y
      );

      context.closePath();
    };

    const draw = (time) => {
      ctx.clearRect(0, 0, width, height);

      const pointerX = pointerRef.current.x;
      const pointerY = pointerRef.current.y;

      /*
       * Base grid
       */
      if (gridOpacity > 0) {
        ctx.strokeStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${gridOpacity})`;
        ctx.lineWidth = lineWidth;

        for (let x = 0; x <= width; x += cellSize) {
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x, height);
          ctx.stroke();
        }

        for (let y = 0; y <= height; y += cellSize) {
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(width, y);
          ctx.stroke();
        }
      }

      /*
       * Cursor interaction cells
       */
      for (const cell of cellsRef.current) {
        const centerX = cell.x + cellSize / 2;
        const centerY = cell.y + cellSize / 2;

        const dx = centerX - pointerX;
        const dy = centerY - pointerY;

        const distance = Math.sqrt(
          dx * dx + dy * dy
        );

        const influence = getFalloff(distance);

        if (influence <= 0) continue;

        const opacity =
          influence * maxOpacity;

        /*
         * Fill
         */
        if (fillOpacity > 0) {
          ctx.fillStyle = `rgba(
            ${rgb.r},
            ${rgb.g},
            ${rgb.b},
            ${opacity * fillOpacity}
          )`;

          roundRect(
            ctx,
            cell.x,
            cell.y,
            cellSize,
            cellSize,
            cellRadius
          );

          ctx.fill();
        }

        /*
         * Border
         */
        if (lineWidth > 0) {
          ctx.strokeStyle = `rgba(
            ${rgb.r},
            ${rgb.g},
            ${rgb.b},
            ${opacity}
          )`;

          ctx.lineWidth = lineWidth;

          roundRect(
            ctx,
            cell.x,
            cell.y,
            cellSize,
            cellSize,
            cellRadius
          );

          ctx.stroke();
        }
      }

      /*
       * Click pulses
       */
      if (clickPulse && pulsesRef.current.length) {
        const activePulses = [];

        for (const pulse of pulsesRef.current) {
          const elapsed = time - pulse.startTime;
          const progress =
            elapsed / pulseSpeed;

          if (progress >= 1) continue;

          activePulses.push(pulse);

          const currentRadius =
            radius * progress;

          const alpha =
            (1 - progress) * maxOpacity;

          ctx.strokeStyle = `rgba(
            ${rgb.r},
            ${rgb.g},
            ${rgb.b},
            ${alpha}
          )`;

          ctx.lineWidth = lineWidth;

          ctx.beginPath();

          ctx.arc(
            pulse.x,
            pulse.y,
            currentRadius,
            0,
            Math.PI * 2
          );

          ctx.stroke();
        }

        pulsesRef.current = activePulses;
      }

      animationRef.current =
        requestAnimationFrame(draw);
    };

    const handlePointerMove = (event) => {
      const rect =
        container.getBoundingClientRect();

      pointerRef.current.x =
        event.clientX - rect.left;

      pointerRef.current.y =
        event.clientY - rect.top;
    };

    const handlePointerLeave = () => {
      pointerRef.current.x = -1000;
      pointerRef.current.y = -1000;
    };

    const handlePointerDown = (event) => {
      if (!clickPulse) return;

      const rect =
        container.getBoundingClientRect();

      pulsesRef.current.push({
        x: event.clientX - rect.left,
        y: event.clientY - rect.top,
        startTime: performance.now(),
      });
    };

    container.addEventListener(
      "pointermove",
      handlePointerMove
    );

    container.addEventListener(
      "pointerleave",
      handlePointerLeave
    );

    container.addEventListener(
      "pointerdown",
      handlePointerDown
    );

    const resizeObserver =
      new ResizeObserver(() => {
        resizeCanvas();
      });

    resizeObserver.observe(container);

    resizeCanvas();

    animationRef.current =
      requestAnimationFrame(draw);

    return () => {
      container.removeEventListener(
        "pointermove",
        handlePointerMove
      );

      container.removeEventListener(
        "pointerleave",
        handlePointerLeave
      );

      container.removeEventListener(
        "pointerdown",
        handlePointerDown
      );

      resizeObserver.disconnect();

      if (animationRef.current) {
        cancelAnimationFrame(
          animationRef.current
        );
      }
    };
  }, [
    cellSize,
    color,
    radius,
    falloff,
    holdTime,
    fadeDuration,
    lineWidth,
    maxOpacity,
    fillOpacity,
    gridOpacity,
    cellRadius,
    clickPulse,
    pulseSpeed,
  ]);

  return (
    <div
      ref={containerRef}
      className={`cursor-grid${
        className ? ` ${className}` : ""
      }`}
    >
      <canvas
        ref={canvasRef}
        className="cursor-grid__canvas"
      />
    </div>
  );
}