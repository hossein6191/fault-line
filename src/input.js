// Input: every pointer is a blade. Touch, pen and mouse (left button held)
// all go through Pointer Events; coalesced events give the blade every
// sample the screen digitiser produced, not just one per frame.

const UI = '.panel, button, input, label, select, a, textarea';

export class Input {
  constructor(game, h) {
    this.game = game;
    this.h = h;
    this.touch = false;
    try { this.touch = (navigator.maxTouchPoints || 0) > 0 && matchMedia('(pointer: coarse)').matches; } catch (e) { /* ignore */ }
    this.active = new Set();
    this.bind();
  }
  bind() {
    const g = this.game;
    const onUi = (e) => Boolean(e.target && e.target.closest && e.target.closest(UI));
    const end = (id) => { if (this.active.delete(id)) g.bladeEnd(id); };

    document.addEventListener('pointerdown', (e) => {
      if (onUi(e)) return;
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      e.preventDefault();
      if (e.pointerType === 'touch') this.touch = true;
      // two blades at most: a palm or a five-finger mash should not clear the screen
      if (this.active.size >= 2) return;
      if (e.pointerType === 'mouse') { try { g.canvas.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ } }
      const [x, y] = g.toLogical(e.clientX, e.clientY);
      this.active.add(e.pointerId);
      g.bladeStart(e.pointerId, x, y);
      this.h.gesture && this.h.gesture();
    }, { passive: false });

    // pointerrawupdate delivers samples as the digitiser produces them, ahead
    // of the frame; where it exists it replaces pointermove (never both)
    const RAW = 'onpointerrawupdate' in window && window.isSecureContext;
    document.addEventListener(RAW ? 'pointerrawupdate' : 'pointermove', (e) => {
      if (!this.active.has(e.pointerId)) return;
      if (e.pointerType === 'mouse' && e.buttons === 0) { end(e.pointerId); return; }
      const list = e.getCoalescedEvents ? e.getCoalescedEvents() : null;
      if (list && list.length) {
        for (const c of list) { const [x, y] = g.toLogical(c.clientX, c.clientY); g.bladeMove(e.pointerId, x, y); }
      } else { const [x, y] = g.toLogical(e.clientX, e.clientY); g.bladeMove(e.pointerId, x, y); }
    }, { passive: true });

    document.addEventListener('pointerup', (e) => end(e.pointerId));
    document.addEventListener('pointercancel', (e) => end(e.pointerId));
    document.addEventListener('lostpointercapture', (e) => { if (e.pointerType === 'mouse') end(e.pointerId); });
    // a touch that starts on the playfield never becomes a back-swipe or a scroll
    document.addEventListener('touchstart', (e) => { if (!onUi(e)) e.preventDefault(); }, { passive: false });
    window.addEventListener('blur', () => { for (const id of [...this.active]) end(id); });
    document.addEventListener('contextmenu', (e) => { if (!onUi(e)) e.preventDefault(); });
    // belt and braces against pull-to-refresh and rubber-band scrolling
    document.addEventListener('touchmove', (e) => { if (!onUi(e)) e.preventDefault(); }, { passive: false });
    document.addEventListener('gesturestart', (e) => e.preventDefault());

    window.addEventListener('keydown', (e) => {
      if (e.ctrlKey || e.metaKey || e.altKey || e.repeat) return;   // leave browser shortcuts alone
      const tag = e.target && e.target.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (tag === 'BUTTON' && (e.code === 'Enter' || e.code === 'Space')) return;
      if (e.code === 'Escape' || e.code === 'KeyP') { this.h.pause(); return; }
      if (e.code === 'KeyM') { this.h.mute(); return; }
      if (e.code === 'Enter' || e.code === 'KeyR' || e.code === 'Space') { e.preventDefault(); this.h.restart(); }
    });
  }
}
