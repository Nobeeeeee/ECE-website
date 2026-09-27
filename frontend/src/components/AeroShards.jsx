import { useEffect, useRef } from "react";

export default function AeroShards({
  backgroundColor = "#0b0f19",
  shardColor = "#8b5cf6",
  accentColor = "#06b6d4",
  density = 1.2,
  shardSize = 1.0,
  speed = 1.0,
  interaction = "repel",
  className = "",
}) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId;
    let width = 0;
    let height = 0;

    const mouse = {
      x: -1000,
      y: -1000,
      targetX: -1000,
      targetY: -1000,
    };

    let shards = [];

    const createShards = (w, h) => {
      const baseCount = Math.floor((w * h) / 18000) * density;
      const count = Math.max(25, Math.min(120, Math.floor(baseCount)));
      const items = [];

      for (let i = 0; i < count; i++) {
        const radius = (Math.random() * 24 + 14) * shardSize;
        const vertexCount = Math.floor(Math.random() * 3) + 3; // 3 to 5 sides
        const offsetAngles = [];
        for (let j = 0; j < vertexCount; j++) {
          offsetAngles.push(
            (j * Math.PI * 2) / vertexCount + (Math.random() * 0.4 - 0.2)
          );
        }

        items.push({
          x: Math.random() * w,
          y: Math.random() * h,
          vx: (Math.random() - 0.5) * 0.6 * speed,
          vy: (Math.random() - 0.5) * 0.6 * speed,
          baseVx: (Math.random() - 0.5) * 0.4 * speed,
          baseVy: (Math.random() - 0.5) * 0.4 * speed,
          radius,
          angle: Math.random() * Math.PI * 2,
          vRot: (Math.random() - 0.5) * 0.015 * speed,
          vertexCount,
          offsetAngles,
          opacity: Math.random() * 0.45 + 0.25,
          colorType: Math.random() > 0.4 ? "shard" : "accent",
        });
      }
      return items;
    };

    const handleResize = () => {
      const parent = canvas.parentElement || document.body;
      width = parent.clientWidth || window.innerWidth;
      height = parent.clientHeight || window.innerHeight;

      const dpr = window.devicePixelRatio || 1;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      shards = createShards(width, height);
    };

    handleResize();
    const resizeObserver = new ResizeObserver(() => handleResize());
    if (canvas.parentElement) {
      resizeObserver.observe(canvas.parentElement);
    }

    const handlePointerMove = (e) => {
      const rect = canvas.getBoundingClientRect();
      mouse.targetX = e.clientX - rect.left;
      mouse.targetY = e.clientY - rect.top;
    };

    const handlePointerLeave = () => {
      mouse.targetX = -1000;
      mouse.targetY = -1000;
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerleave", handlePointerLeave);

    const render = () => {
      // Smooth mouse position
      mouse.x += (mouse.targetX - mouse.x) * 0.1;
      mouse.y += (mouse.targetY - mouse.y) * 0.1;

      // Draw dark glowing backdrop
      ctx.fillStyle = backgroundColor;
      ctx.fillRect(0, 0, width, height);

      // Ambient radial glow behind shards
      const ambientGlow = ctx.createRadialGradient(
        width * 0.5,
        height * 0.4,
        50,
        width * 0.5,
        height * 0.4,
        Math.max(width, height) * 0.7
      );
      ambientGlow.addColorStop(0, "rgba(139, 92, 246, 0.12)");
      ambientGlow.addColorStop(0.6, "rgba(6, 182, 212, 0.05)");
      ambientGlow.addColorStop(1, "rgba(11, 15, 25, 0)");
      ctx.fillStyle = ambientGlow;
      ctx.fillRect(0, 0, width, height);

      // Cursor glow spotlight
      if (mouse.x > 0 && mouse.y > 0) {
        const spotGlow = ctx.createRadialGradient(
          mouse.x,
          mouse.y,
          0,
          mouse.x,
          mouse.y,
          260
        );
        spotGlow.addColorStop(0, "rgba(168, 85, 247, 0.2)");
        spotGlow.addColorStop(0.5, "rgba(6, 182, 212, 0.08)");
        spotGlow.addColorStop(1, "rgba(0, 0, 0, 0)");
        ctx.fillStyle = spotGlow;
        ctx.fillRect(0, 0, width, height);
      }

      // Render Shards
      const radiusLimit = 180;

      for (let i = 0; i < shards.length; i++) {
        const s = shards[i];

        // Interaction physics with mouse
        if (mouse.x > 0 && mouse.y > 0) {
          const dx = s.x - mouse.x;
          const dy = s.y - mouse.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < radiusLimit && dist > 0.001) {
            const force = (1 - dist / radiusLimit) * 2.5;
            const nx = dx / dist;
            const ny = dy / dist;

            if (interaction === "repel") {
              s.vx += nx * force * 0.5;
              s.vy += ny * force * 0.5;
            } else if (interaction === "attract") {
              s.vx -= nx * force * 0.5;
              s.vy -= ny * force * 0.5;
            }
          }
        }

        // Return to base speed gradually
        s.vx += (s.baseVx - s.vx) * 0.03;
        s.vy += (s.baseVy - s.vy) * 0.03;

        s.x += s.vx;
        s.y += s.vy;
        s.angle += s.vRot;

        // Wrap around screen boundaries smoothly
        if (s.x < -40) s.x = width + 40;
        if (s.x > width + 40) s.x = -40;
        if (s.y < -40) s.y = height + 40;
        if (s.y > height + 40) s.y = -40;

        // Draw shard polygon
        ctx.save();
        ctx.translate(s.x, s.y);
        ctx.rotate(s.angle);

        ctx.beginPath();
        for (let j = 0; j < s.vertexCount; j++) {
          const a = s.offsetAngles[j];
          const px = Math.cos(a) * s.radius;
          const py = Math.sin(a) * s.radius;
          if (j === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.closePath();

        // Shard fill gradient
        const baseHex = s.colorType === "shard" ? shardColor : accentColor;
        ctx.fillStyle = baseHex;
        ctx.globalAlpha = s.opacity;
        ctx.fill();

        // Shard outline highlight
        ctx.strokeStyle = "#ffffff";
        ctx.globalAlpha = s.opacity * 0.4;
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.restore();
      }

      // Connecting faint energy lines between nearby shards
      ctx.lineWidth = 0.5;
      for (let i = 0; i < shards.length; i++) {
        for (let j = i + 1; j < shards.length; j++) {
          const dx = shards[i].x - shards[j].x;
          const dy = shards[i].y - shards[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < 110) {
            const alpha = (1 - dist / 110) * 0.18;
            ctx.strokeStyle = `rgba(168, 85, 247, ${alpha})`;
            ctx.beginPath();
            ctx.moveTo(shards[i].x, shards[i].y);
            ctx.lineTo(shards[j].x, shards[j].y);
            ctx.stroke();
          }
        }
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerleave", handlePointerLeave);
      resizeObserver.disconnect();
    };
  }, [backgroundColor, shardColor, accentColor, density, shardSize, speed, interaction]);

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        overflow: "hidden",
        pointerEvents: "none",
        zIndex: 0,
      }}
      className={className}
    >
      <canvas
        ref={canvasRef}
        style={{
          display: "block",
          width: "100%",
          height: "100%",
          pointerEvents: "auto",
        }}
      />
    </div>
  );
}