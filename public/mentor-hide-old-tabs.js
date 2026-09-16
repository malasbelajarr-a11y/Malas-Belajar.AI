(() => {
  const LEGACY_TAB_NAMES = ["students", "codes", "map", "wacawaci", "live"];
  const HIDE_TABS = ["tryout", "explanations", "questions", ...LEGACY_TAB_NAMES];

  function exactText(el, value) {
    return (el.textContent || "").trim().toLowerCase() === value;
  }

  function removeLegacyMentorUi() {
    const dashboard = document.querySelector('[data-testid="mentor-dashboard"]');
    if (!dashboard) return;

    // Hide every old mentor tab button. The new unified mentor builder replaces these.
    HIDE_TABS.forEach((name) => {
      const button = dashboard.querySelector(`[data-testid="mentor-tab-${name}"]`);
      if (button) button.style.display = "none";
    });

    // Remove the old five-button admin navigation row (students/codes/map/wacawaci/live).
    const buttons = Array.from(dashboard.querySelectorAll("button"));
    const legacyButtons = buttons.filter((button) =>
      LEGACY_TAB_NAMES.includes((button.textContent || "").trim().toLowerCase()),
    );
    if (legacyButtons.length >= LEGACY_TAB_NAMES.length) {
      let node = legacyButtons[0];
      for (let i = 0; i < 6 && node && node !== dashboard; i += 1) {
        const text = (node.textContent || "").toLowerCase();
        const hasAll = LEGACY_TAB_NAMES.every((name) => text.includes(name));
        if (hasAll) {
          node.style.display = "none";
          break;
        }
        node = node.parentElement;
      }
    }

    // Remove the old standalone "BUAT KODE SEKALI PAKAI" block.
    const codeHeading = Array.from(dashboard.querySelectorAll("*"))
      .find((el) => exactText(el, "buat kode sekali pakai"));
    if (codeHeading) {
      const section = codeHeading.closest("section");
      if (section) section.style.display = "none";
    }

    // Remove the old mentor content/upload block if it is still rendered separately.
    const contentHeading = Array.from(dashboard.querySelectorAll("*"))
      .find((el) => exactText(el, "konten mentor"));
    if (contentHeading) {
      const section = contentHeading.closest("section");
      if (section) section.style.display = "none";
    }
  }

  const observer = new MutationObserver(removeLegacyMentorUi);
  observer.observe(document.documentElement, { childList: true, subtree: true });
  removeLegacyMentorUi();
  setInterval(removeLegacyMentorUi, 1000);
})();
