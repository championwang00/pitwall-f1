/** Warm the current screen without making external assets a hard dependency. */
export async function prepareInitialResources(onProgress?: (completed: number, total: number) => void) {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  let stopWaitingForWindow: (() => void) | undefined;
  const loaded = document.readyState === "complete" ? Promise.resolve() : new Promise<void>((resolve) => {
    const finish = () => { window.removeEventListener("load", finish); resolve(); };
    stopWaitingForWindow = () => window.removeEventListener("load", finish);
    window.addEventListener("load", finish, { once: true });
  });
  // Give the newly hydrated page a frame to mount its first-screen images.
  await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
  const images = Array.from(document.images).filter((image) => {
    const bounds = image.getBoundingClientRect();
    return bounds.width > 0 && bounds.height > 0 && bounds.top < innerHeight && bounds.bottom > 0;
  }).slice(0, 12);
  const tasks = [
    loaded,
    document.fonts.load('700 14px "Formula1"'),
    document.fonts.load('400 20px "Formula1 Wide"'),
    document.fonts.load('500 14px "Noto Sans SC"'),
    ...images.map((image) => image.decode()),
    fetch("/sounds/f1-engine-launch.wav", { cache: "force-cache" }).then((response) => {
      if (!response.ok) throw new Error("Engine preload failed");
      return response.arrayBuffer();
    }),
    fetch("/sounds/f1-start-light-v2.wav", { cache: "force-cache" }).then((response) => {
      if (!response.ok) throw new Error("Audio preload failed");
      return response.arrayBuffer();
    }),
  ];
  let completed = 0;
  onProgress?.(completed, tasks.length);
  const work = Promise.allSettled(tasks.map((task) => Promise.resolve(task).then(
    (value) => { onProgress?.(++completed, tasks.length); return value; },
    (error) => { onProgress?.(++completed, tasks.length); throw error; },
  )));
  try {
    await Promise.race([work, new Promise<void>((resolve) => { timeout = setTimeout(resolve, 2500); })]);
  } finally {
    clearTimeout(timeout);
    stopWaitingForWindow?.();
  }
}
