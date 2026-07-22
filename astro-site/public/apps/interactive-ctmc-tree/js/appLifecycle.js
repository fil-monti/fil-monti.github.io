export function createAppLifecycle({
    windowObject = window,
    geoMap,
    syncCanvasResolution,
    renderCurrentState,
    isPlaybackRunning,
    getNumTips,
    syncTipCountUi,
    createTreeLayout,
    setTree,
    initAnimation,
    warn = console.warn,
}) {
    function handleResize() {
        syncCanvasResolution();
        geoMap.prebuildPanelCaches();
        if (!isPlaybackRunning()) renderCurrentState();
    }

    async function boot() {
        try {
            await geoMap.preloadAll();
        } catch (error) {
            warn('geoMap.preloadAll:', error);
        }
        geoMap.prebuildPanelCaches();

        const numTips = getNumTips();
        syncTipCountUi(numTips);
        setTree(createTreeLayout(numTips));
        initAnimation();
    }

    function start() {
        if (windowObject?.addEventListener) {
            windowObject.addEventListener('resize', handleResize);
        }
        void boot();
    }

    return {
        start,
        boot,
        handleResize,
    };
}
