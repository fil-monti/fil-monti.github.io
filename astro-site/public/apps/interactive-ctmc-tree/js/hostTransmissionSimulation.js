import { createDiscreteStateCTMCClass } from './ctmcModel.js';

export function createHostTransmissionCTMCClass({
    hostStates,
    hostTransitionMatrix,
    sampleCategorical,
    sampleExp,
}) {
    const BaseCTMC = createDiscreteStateCTMCClass({
        states: hostStates,
        transitionMatrix: hostTransitionMatrix,
        sampleCategorical,
        sampleExp,
    });

    return class HostTransmissionCTMC extends BaseCTMC {
        currentHostName() {
            return this.currentStateName();
        }

        getCurrentHostIndex() {
            return this.getCurrentStateIndex();
        }

        getTargetHostIndex() {
            return this.getTargetStateIndex();
        }

        isTransmitting() {
            return this.isTransitioning();
        }

        getTransmissionProgress() {
            return this.getTransitionProgress();
        }

        completeActiveTransmission() {
            return this.completeActiveTransition();
        }
    };
}
