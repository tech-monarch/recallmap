"use client";

import { motion } from "framer-motion";

export default function DiagonalStripesBackground() {
  return (
     <motion.div
      className="absolute inset-0 z-0 pointer-events-none"
      style={{
        backgroundImage: `
          repeating-linear-gradient(45deg,
            rgba(22, 51, 0, 0.15) 0px,
            rgba(22, 51, 0, 0) 40px,
            transparent 2px,
            transparent 25px
          )
        `,
        backgroundSize: "200% 200%",
        WebkitMaskImage:
          "linear-gradient(to bottom, black 0%, black 80%, transparent 100%)",
        maskImage:
          "linear-gradient(to bottom, black 0%, black 80%, transparent 100%)",
      }}
      animate={{
        backgroundPosition: ["0% 0%", "100% 100%"],
      }}
      transition={{
        duration: 20,
        repeat: Infinity,
        repeatType: "loop",
        ease: "linear",
      }}
    />
  );
}
