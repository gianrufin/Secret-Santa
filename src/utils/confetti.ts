import confetti from 'canvas-confetti';

export function fireHolidayConfetti() {
  // Christmas colors: Red, Gold, Green, Snow White
  const colors = ['#dc2626', '#16a34a', '#eab308', '#ffffff', '#b91c1c'];

  // Left burst
  confetti({
    particleCount: 50,
    angle: 60,
    spread: 55,
    origin: { x: 0 },
    colors,
  });

  // Right burst
  confetti({
    particleCount: 50,
    angle: 120,
    spread: 55,
    origin: { x: 1 },
    colors,
  });
}

export function fireUnwrapConfetti() {
  const duration = 2.5 * 1000;
  const animationEnd = Date.now() + duration;
  const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 9999 };

  const interval: any = setInterval(() => {
    const timeLeft = animationEnd - Date.now();

    if (timeLeft <= 0) {
      return clearInterval(interval);
    }

    const particleCount = 40 * (timeLeft / duration);
    confetti({
      ...defaults,
      particleCount,
      origin: { x: Math.random() * 0.4 + 0.3, y: Math.random() * 0.3 + 0.3 },
      colors: ['#ef4444', '#22c55e', '#fbbf24', '#ffffff', '#10b981'],
    });
  }, 250);
}
