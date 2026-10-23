export const WIDGET_STYLES = `
:host {
  all: initial;
}

.aih-root,
.aih-root *,
.aih-root *::before,
.aih-root *::after {
  box-sizing: border-box;
}

.aih-root {
  --aih-bg-default: #101010;
  --aih-bg-raised-default: #171717;
  --aih-bubble-bot-default: #0a0a0a;
  --aih-bubble-bot-border-default: #1f1f1f;
  --aih-bubble-user-default: #1c1c1c;
  --aih-fg-default: #f5f5f5;
  --aih-fg-muted-default: #9a9a9a;
  --aih-border-default: #2a2a2a;
  --aih-chip-bg-default: #1a1a1a;
  --aih-chip-border-default: #333333;
  --aih-input-bg-default: #0b0b0b;
  --aih-focus-default: #e5e5e5;
  --aih-accent-default: #8c8c8c;
  --aih-accent-fg-default: #0a0a0a;
  --aih-logo-bg-default: #ffffff;
  --aih-logo-fg-default: #0a0a0a;
  --aih-online-default: #f5f5f5;
  --aih-danger-default: #f87171;
  --aih-radius-default: 16px;
  --aih-width-default: 320px;
  --aih-height-default: 416px;
  --aih-font-default: Inter, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
  --aih-shadow-default: 0 24px 60px -12px rgba(0, 0, 0, 0.7),
    0 0 0 1px rgba(255, 255, 255, 0.02) inset;

  --_aih-bg: var(--aih-bg, var(--aih-bg-default));
  --_aih-bg-raised: var(--aih-bg-raised, var(--aih-bg-raised-default));
  --_aih-bubble-bot: var(--aih-bubble-bot, var(--aih-bubble-bot-default));
  --_aih-bubble-bot-border: var(
    --aih-bubble-bot-border,
    var(--aih-bubble-bot-border-default)
  );
  --_aih-bubble-user: var(--aih-bubble-user, var(--aih-bubble-user-default));
  --_aih-fg: var(--aih-fg, var(--aih-fg-default));
  --_aih-fg-muted: var(--aih-fg-muted, var(--aih-fg-muted-default));
  --_aih-border: var(--aih-border, var(--aih-border-default));
  --_aih-chip-bg: var(--aih-chip-bg, var(--aih-chip-bg-default));
  --_aih-chip-border: var(--aih-chip-border, var(--aih-chip-border-default));
  --_aih-input-bg: var(--aih-input-bg, var(--aih-input-bg-default));
  --_aih-focus: var(--aih-focus, var(--aih-focus-default));
  --_aih-accent: var(--aih-accent, var(--aih-accent-default));
  --_aih-accent-fg: var(--aih-accent-fg, var(--aih-accent-fg-default));
  --_aih-logo-bg: var(--aih-logo-bg, var(--aih-logo-bg-default));
  --_aih-logo-fg: var(--aih-logo-fg, var(--aih-logo-fg-default));
  --_aih-online: var(--aih-online, var(--aih-online-default));
  --_aih-danger: var(--aih-danger, var(--aih-danger-default));
  --_aih-radius: var(--aih-radius, var(--aih-radius-default));
  --_aih-width: var(--aih-width, var(--aih-width-default));
  --_aih-height: var(--aih-height, var(--aih-height-default));
  --_aih-font: var(--aih-font, var(--aih-font-default));
  --_aih-shadow: var(--aih-shadow, var(--aih-shadow-default));
  --_aih-danger-soft: color-mix(in srgb, var(--_aih-danger) 10%, transparent);

  position: fixed;
  inset: 0;
  z-index: var(--aih-z-index, 2147483000);
  pointer-events: none;
  color: var(--_aih-fg);
  font-family: var(--_aih-font);
  font-size: 14px;
  line-height: 1.5;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

.aih-root[data-theme="light"] {
  --aih-bg-default: #ffffff;
  --aih-bg-raised-default: #f5f5f5;
  --aih-bubble-bot-default: #fafafa;
  --aih-bubble-bot-border-default: #ededed;
  --aih-bubble-user-default: #f0f0f0;
  --aih-fg-default: #111111;
  --aih-fg-muted-default: #6b6b6b;
  --aih-border-default: #e5e5e5;
  --aih-chip-bg-default: #f6f6f6;
  --aih-chip-border-default: #e5e5e5;
  --aih-input-bg-default: #ffffff;
  --aih-focus-default: #111111;
  --aih-accent-default: #171717;
  --aih-accent-fg-default: #ffffff;
  --aih-logo-bg-default: #171717;
  --aih-logo-fg-default: #ffffff;
  --aih-online-default: #16a34a;
  --aih-danger-default: #dc2626;
  --aih-shadow-default: 0 24px 60px -16px rgba(0, 0, 0, 0.2),
    0 0 0 1px rgba(0, 0, 0, 0.02) inset;
}

@media (prefers-color-scheme: light) {
  .aih-root[data-theme="auto"] {
    --aih-bg-default: #ffffff;
    --aih-bg-raised-default: #f5f5f5;
    --aih-bubble-bot-default: #fafafa;
    --aih-bubble-bot-border-default: #ededed;
    --aih-bubble-user-default: #f0f0f0;
    --aih-fg-default: #111111;
    --aih-fg-muted-default: #6b6b6b;
    --aih-border-default: #e5e5e5;
    --aih-chip-bg-default: #f6f6f6;
    --aih-chip-border-default: #e5e5e5;
    --aih-input-bg-default: #ffffff;
    --aih-focus-default: #111111;
    --aih-accent-default: #171717;
    --aih-accent-fg-default: #ffffff;
    --aih-logo-bg-default: #171717;
    --aih-logo-fg-default: #ffffff;
    --aih-online-default: #16a34a;
    --aih-danger-default: #dc2626;
    --aih-shadow-default: 0 24px 60px -16px rgba(0, 0, 0, 0.2),
      0 0 0 1px rgba(0, 0, 0, 0.02) inset;
  }
}

.aih-root :where(button) {
  appearance: none;
  margin: 0;
  border: 0;
  padding: 0;
  background: none;
  color: inherit;
  font: inherit;
  cursor: pointer;
}

.aih-root :where(button:disabled) {
  cursor: not-allowed;
}

.aih-root :where(textarea) {
  font: inherit;
}

.aih-root :focus-visible {
  outline: 2px solid var(--_aih-focus);
  outline-offset: 2px;
}

.aih-launcher {
  position: fixed;
  right: 18px;
  bottom: 18px;
  width: 52px;
  height: 52px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  pointer-events: auto;
  color: var(--_aih-fg);
  background: var(--_aih-bg-raised);
  border: 1px solid var(--_aih-border);
  box-shadow: 0 12px 30px -8px rgba(0, 0, 0, 0.7);
  transition:
    opacity 160ms ease,
    transform 160ms ease,
    background-color 150ms ease;
}

.aih-root[data-position="bottom-left"] .aih-launcher {
  right: auto;
  left: 18px;
}

.aih-launcher:hover {
  transform: translateY(-2px);
  background: color-mix(in srgb, var(--_aih-bg-raised) 84%, var(--_aih-fg));
}

.aih-launcher:active {
  transform: translateY(0) scale(0.97);
}

.aih-root[data-open="true"] .aih-launcher {
  opacity: 0;
  visibility: hidden;
  transform: translateY(6px) scale(0.92);
  pointer-events: none;
}

.aih-launcher-icons {
  position: relative;
  width: 22px;
  height: 22px;
}

.aih-launcher-icon {
  position: absolute;
  inset: 0;
  width: 22px;
  height: 22px;
  transition:
    transform 220ms cubic-bezier(0.2, 0.8, 0.2, 1),
    opacity 160ms ease;
}

.aih-launcher-icon.is-close {
  transform: rotate(-90deg) scale(0.42);
  opacity: 0;
}

.aih-unread {
  position: absolute;
  top: 2px;
  right: 2px;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #ffffff;
  border: 2px solid var(--_aih-bg);
}

.aih-panel {
  position: fixed;
  right: 18px;
  bottom: 18px;
  width: var(--_aih-width);
  height: var(--_aih-height);
  max-width: calc(100vw - 28px);
  max-height: calc(100dvh - 36px);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  pointer-events: auto;
  background: var(--_aih-bg);
  border: 1px solid var(--_aih-border);
  border-radius: var(--_aih-radius);
  box-shadow: var(--_aih-shadow);
  transform-origin: bottom right;
  animation: aih-panel-in 220ms cubic-bezier(0.2, 0.8, 0.2, 1);
}

.aih-root[data-position="bottom-left"] .aih-panel {
  right: auto;
  left: 18px;
  transform-origin: bottom left;
}

.aih-header {
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  gap: 10px;
  padding: 12px;
  background: var(--_aih-bg);
  border-bottom: 1px solid var(--_aih-border);
}

.aih-avatar {
  flex: none;
  width: 28px;
  height: 28px;
  border-radius: 8px;
  display: grid;
  place-items: center;
  overflow: hidden;
  background: var(--_aih-logo-bg);
  color: var(--_aih-logo-fg);
  font-size: 11px;
  font-weight: 600;
  letter-spacing: -0.02em;
}

.aih-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.aih-header-copy {
  flex: 1;
  min-width: 0;
  line-height: 1.25;
}

.aih-title {
  font-size: 14px;
  font-weight: 600;
  letter-spacing: -0.01em;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.aih-subtitle {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 2px;
  color: var(--_aih-fg-muted);
  font-size: 12px;
  font-weight: 400;
  white-space: nowrap;
}

.aih-status-dot {
  width: 6px;
  height: 6px;
  flex: 0 0 auto;
  border-radius: 50%;
  background: var(--_aih-online);
}

.aih-status-dot.is-offline {
  background: var(--_aih-fg-muted);
}

.aih-header-actions {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 0;
}

.aih-icon-btn {
  width: 30px;
  height: 30px;
  border-radius: 8px;
  display: grid;
  place-items: center;
  color: var(--_aih-fg);
  transition: background-color 150ms ease;
}

.aih-icon-btn svg {
  width: 15px;
  height: 15px;
}

.aih-icon-btn:hover {
  background: rgba(255, 255, 255, 0.07);
}

.aih-icon-btn.is-new-chat {
  width: 0;
  opacity: 0;
  overflow: hidden;
  pointer-events: none;
  transition:
    width 150ms ease,
    opacity 150ms ease,
    background-color 150ms ease;
}

.aih-header:hover .aih-icon-btn.is-new-chat,
.aih-header:focus-within .aih-icon-btn.is-new-chat {
  width: 30px;
  opacity: 1;
  pointer-events: auto;
}

.aih-root[data-theme="light"] .aih-icon-btn:hover,
.aih-root[data-theme="auto"] .aih-icon-btn:hover {
  background: rgba(0, 0, 0, 0.06);
}

.aih-messages-wrap {
  position: relative;
  flex: 1 1 auto;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.aih-messages {
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 14px 16px 8px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  scrollbar-width: thin;
  scrollbar-color: #3a3a3a transparent;
}

.aih-messages::-webkit-scrollbar {
  width: 6px;
}

.aih-messages::-webkit-scrollbar-thumb {
  background: #3a3a3a;
  border-radius: 99px;
}

.aih-messages::-webkit-scrollbar-track {
  background: transparent;
}

.aih-welcome {
  margin: auto;
  padding: 22px 10px 18px;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}

.aih-welcome-orb {
  width: 44px;
  height: 44px;
  display: grid;
  place-items: center;
  margin-bottom: 14px;
  border-radius: 12px;
  overflow: hidden;
  background: var(--_aih-logo-bg);
  color: var(--_aih-logo-fg);
  font-size: 15px;
  font-weight: 600;
  letter-spacing: -0.02em;
}

.aih-welcome-orb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.aih-welcome h2 {
  margin: 0 0 6px;
  font-size: 14px;
  font-weight: 600;
  letter-spacing: -0.01em;
}

.aih-welcome p {
  max-width: 228px;
  margin: 0;
  color: var(--_aih-fg-muted);
  font-size: 12.5px;
  line-height: 1.55;
}

.aih-welcome-hint {
  display: none;
}

.aih-message {
  display: flex;
  flex-direction: column;
  max-width: 78%;
  animation: aih-pop 220ms ease both;
}

.aih-message.user {
  align-self: flex-end;
  align-items: flex-end;
}

.aih-message.assistant {
  align-self: flex-start;
  align-items: flex-start;
}

.aih-bubble {
  padding: 10px 14px;
  border-radius: 16px;
  font-size: 14px;
  font-weight: 500;
  line-height: 1.65;
  overflow-wrap: anywhere;
  word-break: break-word;
}

.aih-message.user .aih-bubble {
  white-space: pre-wrap;
  color: var(--_aih-fg);
  background: var(--_aih-bubble-user);
  border-bottom-right-radius: 6px;
}

.aih-message.assistant .aih-bubble {
  color: var(--_aih-fg);
  background: var(--_aih-bubble-bot);
  border: 1px solid var(--_aih-bubble-bot-border);
  border-bottom-left-radius: 6px;
}

.aih-message-meta {
  margin-top: 4px;
  padding: 0 3px;
  color: var(--_aih-fg-muted);
  font-size: 10px;
}

.aih-stream-caret {
  display: inline-block;
  width: 5px;
  height: 12px;
  margin-left: 2px;
  vertical-align: -2px;
  border-radius: 1px;
  background: var(--_aih-fg-muted);
  animation: aih-caret-blink 900ms step-end infinite;
}

.aih-markdown > *:first-child {
  margin-top: 0;
}

.aih-markdown > *:last-child {
  margin-bottom: 0;
}

.aih-markdown p {
  margin: 0;
}

.aih-markdown p + p {
  margin-top: 8px;
}

.aih-markdown h1,
.aih-markdown h2,
.aih-markdown h3,
.aih-markdown h4,
.aih-markdown h5,
.aih-markdown h6 {
  margin: 10px 0 5px;
  font-size: 14px;
  font-weight: 600;
  line-height: 1.35;
}

.aih-markdown ul,
.aih-markdown ol {
  margin: 5px 0 7px;
  padding-left: 18px;
}

.aih-markdown li {
  margin: 2px 0;
}

.aih-markdown li::marker {
  color: var(--_aih-fg-muted);
}

.aih-markdown strong {
  font-weight: 600;
  color: var(--_aih-fg);
}

.aih-markdown a {
  color: inherit;
  text-decoration: underline;
  text-underline-offset: 3px;
}

.aih-markdown blockquote {
  margin: 7px 0;
  padding-left: 10px;
  border-left: 2px solid var(--_aih-border);
  color: var(--_aih-fg-muted);
}

.aih-markdown hr {
  margin: 9px 0;
  border: 0;
  border-top: 1px solid var(--_aih-border);
}

.aih-inline-code {
  padding: 1px 5px;
  border-radius: 5px;
  background: color-mix(in srgb, var(--_aih-fg) 8%, transparent);
  color: var(--_aih-fg);
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 12.5px;
}

.aih-code {
  margin: 7px 0;
  overflow: hidden;
  border: 1px solid var(--_aih-border);
  border-radius: 9px;
  background: color-mix(in srgb, var(--_aih-bg) 62%, #000);
}

.aih-root[data-theme="light"] .aih-code {
  background: #f7f7f7;
}

.aih-code-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 4px 5px 4px 9px;
  border-bottom: 1px solid var(--_aih-border);
}

.aih-code-lang {
  color: var(--_aih-fg-muted);
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 9px;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.aih-copy {
  padding: 3px 6px;
  border-radius: 5px;
  color: var(--_aih-fg-muted);
  font-size: 10px;
}

.aih-copy:hover {
  color: var(--_aih-fg);
  background: rgba(255, 255, 255, 0.06);
}

.aih-code pre {
  margin: 0;
  padding: 9px 10px;
  overflow-x: auto;
}

.aih-code code {
  color: var(--_aih-fg);
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 11px;
  line-height: 1.6;
  white-space: pre;
}

.aih-typing {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 2px 0 4px;
  color: var(--_aih-fg-muted);
  font-size: 12.5px;
  animation: aih-pop 180ms ease both;
}

.aih-typing-name {
  color: var(--_aih-fg);
  font-weight: 500;
}

.aih-dots {
  display: inline-flex;
  align-items: center;
  gap: 3px;
}

.aih-dots i {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: var(--_aih-fg-muted);
  animation: aih-bounce 1.1s infinite ease-in-out;
}

.aih-dots i:nth-child(2) {
  animation-delay: 150ms;
}

.aih-dots i:nth-child(3) {
  animation-delay: 300ms;
}

.aih-error {
  align-self: stretch;
  display: flex;
  gap: 8px;
  align-items: flex-start;
  padding: 10px 11px;
  border-radius: 10px;
  border: 1px solid color-mix(in srgb, var(--_aih-danger) 25%, transparent);
  background: var(--_aih-danger-soft);
  animation: aih-pop 180ms ease both;
}

.aih-error-icon {
  width: 15px;
  height: 15px;
  flex: 0 0 auto;
  margin-top: 1px;
  color: var(--_aih-danger);
}

.aih-error-copy {
  flex: 1;
  min-width: 0;
}

.aih-error-title {
  font-size: 12px;
  font-weight: 600;
}

.aih-error-message {
  margin-top: 2px;
  color: var(--_aih-fg-muted);
  font-size: 11.5px;
  line-height: 1.45;
}

.aih-retry {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  margin-top: 7px;
  padding: 4px 8px;
  border: 1px solid var(--_aih-border);
  border-radius: 6px;
  color: var(--_aih-fg);
  font-size: 10.5px;
  font-weight: 500;
}

.aih-retry:hover {
  background: var(--_aih-bg-raised);
}

.aih-retry svg {
  width: 11px;
  height: 11px;
}

.aih-scroll-bottom {
  position: absolute;
  left: 50%;
  bottom: 7px;
  width: 28px;
  height: 28px;
  transform: translateX(-50%);
  display: grid;
  place-items: center;
  border-radius: 50%;
  pointer-events: auto;
  background: var(--_aih-bg-raised);
  border: 1px solid var(--_aih-border);
  color: var(--_aih-fg);
  box-shadow: 0 5px 14px rgba(0, 0, 0, 0.25);
}

.aih-scroll-bottom svg {
  width: 13px;
  height: 13px;
}

.aih-suggestions {
  display: flex;
  flex: 0 0 auto;
  gap: 8px;
  padding: 10px 12px 8px;
  overflow-x: auto;
  overflow-y: hidden;
  white-space: nowrap;
  border-top: 1px solid var(--_aih-border);
  scrollbar-width: thin;
  scrollbar-color: #3a3a3a transparent;
}

.aih-suggestions::-webkit-scrollbar {
  height: 6px;
}

.aih-suggestions::-webkit-scrollbar-thumb {
  background: #3a3a3a;
  border-radius: 99px;
}

.aih-chip {
  flex: 0 0 auto;
  padding: 7px 12px;
  border-radius: 10px;
  border: 1px solid var(--_aih-chip-border);
  background: var(--_aih-chip-bg);
  color: var(--_aih-fg);
  font-size: 12.5px;
  font-weight: 600;
  transition:
    background-color 150ms ease,
    border-color 150ms ease,
    transform 100ms ease;
}

.aih-chip:hover {
  background: color-mix(in srgb, var(--_aih-chip-bg) 82%, var(--_aih-fg));
  border-color: color-mix(in srgb, var(--_aih-chip-border) 55%, var(--_aih-fg));
}

.aih-chip:active {
  transform: scale(0.97);
}

.aih-chip:disabled {
  opacity: 0.55;
}

.aih-composer {
  display: flex;
  flex: 0 0 auto;
  align-items: flex-end;
  gap: 10px;
  padding: 8px 12px 12px;
  border-top: 1px solid var(--_aih-border);
}

.aih-suggestions + .aih-composer {
  border-top-color: transparent;
}

.aih-input {
  flex: 1 1 auto;
  min-width: 0;
  min-height: 40px;
  max-height: 96px;
  padding: 9px 14px;
  resize: none;
  outline: none;
  background: var(--_aih-input-bg);
  color: var(--_aih-fg);
  border: 1px solid var(--_aih-border);
  border-radius: 12px;
  font-size: 14px;
  line-height: 1.45;
  scrollbar-width: thin;
  transition:
    border-color 150ms ease,
    box-shadow 150ms ease;
}

.aih-input::placeholder {
  color: #8a8a8a;
}

.aih-input:focus {
  border-color: var(--_aih-focus);
  box-shadow:
    0 0 0 2px var(--_aih-bg),
    0 0 0 4px color-mix(in srgb, var(--_aih-focus) 55%, transparent);
}

.aih-send,
.aih-stop {
  flex: none;
  width: 32px;
  height: 32px;
  margin-bottom: 4px;
  border-radius: 9px;
  display: grid;
  place-items: center;
  transition:
    opacity 150ms ease,
    transform 100ms ease,
    filter 150ms ease,
    background-color 150ms ease;
}

.aih-send {
  background: var(--_aih-accent);
  color: var(--_aih-accent-fg);
}

.aih-send svg,
.aih-stop svg {
  width: 16px;
  height: 16px;
}

.aih-send:hover:not(:disabled) {
  filter: brightness(1.12);
}

.aih-send:active:not(:disabled) {
  transform: scale(0.94);
}

.aih-send:disabled {
  opacity: 0.45;
  filter: none;
}

.aih-stop {
  color: var(--_aih-fg);
  background: var(--_aih-bg-raised);
  border: 1px solid var(--_aih-border);
}

.aih-stop:hover {
  background: color-mix(in srgb, var(--_aih-bg-raised) 82%, var(--_aih-fg));
}

.aih-sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

@keyframes aih-panel-in {
  from {
    opacity: 0;
    transform: translateY(8px) scale(0.97);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

@keyframes aih-pop {
  from {
    opacity: 0;
    transform: translateY(6px);
  }
  to {
    opacity: 1;
    transform: none;
  }
}

@keyframes aih-bounce {
  0%,
  60%,
  100% {
    opacity: 0.35;
    transform: translateY(0);
  }
  30% {
    opacity: 1;
    transform: translateY(-3px);
  }
}

@keyframes aih-caret-blink {
  0%,
  48% {
    opacity: 1;
  }
  49%,
  100% {
    opacity: 0;
  }
}

@media (max-width: 480px) {
  .aih-panel {
    inset: 0;
    width: 100%;
    height: 100vh;
    height: 100dvh;
    max-width: none;
    max-height: none;
    border: 0;
    border-radius: 0;
    animation-name: aih-sheet-in;
  }

  .aih-header {
    padding-top: max(12px, env(safe-area-inset-top));
  }

  .aih-messages {
    padding-left: 14px;
    padding-right: 14px;
  }

  .aih-composer {
    padding-bottom: max(12px, env(safe-area-inset-bottom));
  }

  .aih-launcher {
    right: 16px;
    bottom: max(16px, env(safe-area-inset-bottom));
  }

  .aih-root[data-position="bottom-left"] .aih-launcher {
    left: 16px;
  }

  .aih-icon-btn.is-new-chat {
    width: 30px;
    opacity: 1;
    pointer-events: auto;
  }
}

@keyframes aih-sheet-in {
  from {
    opacity: 0;
    transform: translateY(14px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@media (prefers-reduced-motion: reduce) {
  .aih-root *,
  .aih-root *::before,
  .aih-root *::after {
    animation: none !important;
    transition: none !important;
  }

  .aih-dots i {
    opacity: 0.7;
  }
}
`;
