import { initializeBackground } from "../background";

export default defineBackground({
  type: "module",
  main() {
    initializeBackground();
  },
});
