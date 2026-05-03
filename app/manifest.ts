import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "LeadPayX",
    short_name: "LeadPayX",
    description: "Controle leads. Distribua operações. Pague resultados.",
    start_url: "/",
    display: "standalone",
    background_color: "#050706",
    theme_color: "#050706",
    lang: "pt-BR",
    orientation: "portrait-primary",
    icons: [
      {
        src: "/icon.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/apple-icon.png",
        sizes: "180x180",
        type: "image/png",
        purpose: "any",
      },
    ],
  };
}
