// Minimal PWA install helper that works across Android and iOS

// Some browsers (Android Chrome) fire a non-standard event for install prompt
// Define a narrow interface to avoid using "any"
interface InstallPromptEvent extends Event {
	prompt: () => Promise<void>;
}

let deferredPrompt: InstallPromptEvent | null = null;

// Detect iOS devices (Safari/Chrome on iOS)
export function isIosDevice(): boolean {
	if (typeof navigator === 'undefined') return false;
	const ua = navigator.userAgent || navigator.vendor || (window as unknown as { opera?: string }).opera || '';
	return /iPad|iPhone|iPod/.test(String(ua));
}

// Detect if already installed (standalone display mode)
export function isInStandaloneMode(): boolean {
	if (typeof window === 'undefined') return false;
	const inStandalone = window.matchMedia && window.matchMedia('(display-mode: standalone)').matches;
	const iosStandalone = (navigator as unknown as { standalone?: boolean }).standalone === true;
	return Boolean(inStandalone || iosStandalone);
}

// Listen for the beforeinstallprompt event once at module load
if (typeof window !== 'undefined') {
	window.addEventListener('beforeinstallprompt', (event: Event) => {
		// Prevent Chrome 67 and earlier from automatically showing the prompt
		event.preventDefault();
		deferredPrompt = event as InstallPromptEvent;
	});
}

export function canPromptInstall(): boolean {
	return deferredPrompt !== null;
}

export async function promptInstall(): Promise<boolean> {
	if (!deferredPrompt) return false;
	const promptEvent = deferredPrompt;
	// Clear to avoid multiple prompts
	deferredPrompt = null;
	try {
		await promptEvent.prompt();
		return true;
	} catch {
		return false;
	}
}

// Heuristic: show the install entry point when not installed
// On iOS we still show it to present instructions
export function shouldShowInstall(): boolean {
	return !isInStandaloneMode();
}


