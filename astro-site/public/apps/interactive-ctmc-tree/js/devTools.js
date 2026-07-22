export function registerDevTreeHooks({
    treeParams,
    nodeOffsets,
    rebuildTree,
    customModelController = null,
}) {
    if (typeof window === 'undefined') return () => {};

    const devApi = {
        treeParams,
        nodeOffsets,
        rebuildTree,
        customModelController,
    };

    window.interactiveMultiTreeDev = devApi;

    // Preserve the previous console-tweaking API while keeping the wiring out of app.js.
    window.TREE_PARAMS = treeParams;
    window.NODE_OFFSETS = nodeOffsets;
    window.rebuildTree = rebuildTree;

    return function unregisterDevTreeHooks() {
        if (window.interactiveMultiTreeDev === devApi) delete window.interactiveMultiTreeDev;
        if (window.TREE_PARAMS === treeParams) delete window.TREE_PARAMS;
        if (window.NODE_OFFSETS === nodeOffsets) delete window.NODE_OFFSETS;
        if (window.rebuildTree === rebuildTree) delete window.rebuildTree;
    };
}
