import {
    bindHelpModals,
    createBranchTrackController,
} from './uiControllers.js';
import { renderIfIdle } from './appControlsShared.js';

export function bindAuxiliaryControls({
    dom,
    state,
    animationController,
    renderCurrentState,
    isPlaybackRunning,
    stopPlayback,
    exitTimeTravelMode,
    notifyStateChange,
    alertFn = message => window.alert(message),
} = {}) {
    const {
        observationsCheckbox,
        timeTravelCheckbox,
        timeSliderContainer,
        timeSlider,
    } = dom;

    observationsCheckbox?.addEventListener('change', event => {
        state.setFlag('observationsMode', event.target.checked);
        renderIfIdle(isPlaybackRunning, renderCurrentState);
        notifyStateChange();
    });

    timeTravelCheckbox?.addEventListener('change', event => {
        const isEnabled = state.setTimeTravelMode(event.target.checked);
        if (isEnabled) {
            if (!animationController.hasTimeTravelHistory()) {
                alertFn('Please run the animation first to generate history for time travel.');
                event.target.checked = false;
                state.setTimeTravelMode(false);
                return;
            }
            timeSliderContainer?.classList.add('active');
            if (isPlaybackRunning()) stopPlayback();
            if (timeSlider) timeSlider.value = 100;
            renderCurrentState();
            notifyStateChange();
            return;
        }

        exitTimeTravelMode({ resetSlider: false });
        renderCurrentState();
        notifyStateChange();
    });

    timeSlider?.addEventListener('input', event => {
        if (state.timeTravelMode) animationController.handleTimeTravel(parseFloat(event.target.value));
    });

    createBranchTrackController({
        dom,
        initialMode: state.branchTrackMode,
        onModeChange: mode => {
            state.setMode('branchTrackMode', mode);
            renderCurrentState();
            notifyStateChange();
        },
    });

    bindHelpModals({ dom });
}
