export class UiLayer{
    constructor(pseudolayer, layerNumber) {
        // same id as the pseudolayer, can be used to get the DOM element, the pseudolayer or the uiLayer by id. 
        this.id = pseudolayer.id;
        // the name of the pseudolayer on the ui;
        this.name = `Test layer ${layerNumber}`;
        // the pseudolayer that is rendered -> updated every time a parameter is updated. reset to originalPseudolayer on reset.
        this.pseudolayer = pseudolayer;
        // the original layer -> should never change
        this.originalPseudolayer = pseudolayer;
        // tracks state for all of the guis -> checked whenever a gui is initialised, so the gui can have the
        // same value as the last input by the user
        this.state = {};
        // html required to add the layer to the layer panel of the ui
        const html = `<div class="layer" id="${this.id}" data-id="${this.id}">
                        <button class="delete_layer" data-id="${this.id}">&#10060</button>
                        <span id="Test layer ${layerNumber}" class="layer_text" data-id="${this.id}">${this.name}</span>
                     </div>`
        this.html = document.createElement("div");
        this.html.innerHTML = html;
    }
}

export class Ui {
    constructor(webgl, constructor) {
        // the WebGLCanvas object
        this._webgl = webgl;
        // constructors for the shader programs
        this._constructor = constructor;
        // object where keys are the id of the uiLayer, and the property is the uiLayer
        this._uiLayers = {};
        // ordered array -> first element in this array is the pseudolayer that is rendered
        this._uiLayersOrder = [];
        // which layer is currently selected on the ui, and therefore is the target of any processing
        this.activeUiLayer = false;
        // which, if any, gui is currently rendered on the screen
        this.activeGui = false;
        // the previous gui that was rendered -> prevents the updated base pseudolayer from being used
        // if the same gui is used consecutively
        this._lastGui = false;
        // an object containing the methods that need to be called when a gui is to be opened
        this.guis = {
            "rgbaManipulation": this.rgbaManipulationGui,
            "rgbFiltering": this.rgbFilteringGui,
            "rgbPercentageFiltering": this.rgbPercentageFilteringGui,
            "apply3x3Kernel": this.apply3x3KernelGui,
            "sobelEdgeDetection": this.sobelEdgeDetection,
            "greyscale": this.greyscale,
            "stackLayers": this.stackLayers,
        }
    }

    // add a pseudolayer to the ui, generating a new uiLayer. this uiLayer is added to the end 
    // of the existing uiLayers
    addUiLayer = (pseudolayer) => {
        // the number of the uiLayer -> for naming
        const layerNumber = this._uiLayersOrder.length + 1;
        // creates a new uiLayer
        const uiLayer = new UiLayer(pseudolayer, layerNumber);
        // adds the uiLayer to the layer tracker, where the uiLayer can directly be called via the id of the layer
        this._uiLayers[uiLayer.id] = uiLayer;
        // update the uiLayersOrder -> adds to the end by default, therefore this layer is rendered last
        this._uiLayersOrder.push(uiLayer.id);
        // adds the html from the uiLayer to update the map
        document.getElementById("layers_holder").appendChild(uiLayer.html);
        // determines which of the current uiLayers should be rendered
        this._renderActiveUiLayer();
    }

    // removes a uiLayer 
    removeUiLayer = (uiLayer) => {
        // gets the id of the uiLayer to be removed
        const uiLayerDeleteId = uiLayer.dataset.id;
        // removes the uiLayer from the uiLayers object
        delete this._uiLayers[uiLayerDeleteId];
        // removes the uiLayer from uiLayersOrder array
        this._uiLayersOrder = this._uiLayersOrder.filter(item => item !== parseInt(uiLayerDeleteId));
        // updates the active uiLayer with the first element in the uiLayersOrder array if a uiLayer exists
        if (this._uiLayersOrder.length > 0) {
            const newActiveUiLayerId = this._uiLayersOrder[0];
            const newActiveUiLayer = this._uiLayers[newActiveUiLayerId];
            // sets the active layer
            this.activeUiLayer = newActiveUiLayer;
            // update the css
            document.getElementById(newActiveUiLayerId).classList.add("selected");
        } else {
            this.activeUiLayer = false;
            this._webgl.clearCanvas();
        }
        // deletes the uiLayer from the DOM
        document.getElementById(uiLayerDeleteId).remove();
        // determines which of the current uiLayers should be rendered
        this._renderActiveUiLayer();
    }

    // updates a uiLayer, by changing the "pseudolayer" property of the uiLayer to the new 
    // pseudolayer to be rendered
    updateUiLayer = (uiLayer, pseudolayer) => {
        uiLayer.pseudolayer = pseudolayer;
        // determines which of the current uiLayers should be rendered
        this._renderActiveUiLayer();
    }

    // resets a layer by changing the pseudolayer property back to the originalPseudolayer property.
    // also resets the state object of that layer, removing any gui values.
    // then re-renders the gui with the reset values, and re-renders the pseudolayer
    resetUiLayer = () => {
        // gets the DOM element id of the currently active gui
        const activeGuiId = this.activeGui.id;
        // gets the method required to build that gui
        const buildGui = this.guis[activeGuiId];
        // sets the pseudolayer of the uiLayer to the original pseudolayer
        this.activeUiLayer.pseudolayer = this.activeUiLayer.originalPseudolayer;
        // resets the state object of the uiLayer
        this.activeUiLayer.state = {};
        // removes the current gui
        this.removeGui();
        // rebuilds the current gui, with reset values
        buildGui();
        // determines which of the current layers should be rendered
        this._renderActiveUiLayer();
    }

    // activates a layer when clicked
    activateUiLayer = (clickedLayer) => {
        // remove selected class from any element that is currently selected
        const selectedElements = document.getElementsByClassName("selected");
        for (let x = 0; x < selectedElements.length; x++) {
            selectedElements[x].classList.remove("selected");
        }
        // get id of the layer that was clicked
        const uiLayerId = clickedLayer.dataset.id;
        const uiLayerDiv = document.getElementById(uiLayerId);
        const uiLayer = this._uiLayers[uiLayerId];
        // set the layer as the active uiLayer
        this.activeUiLayer = uiLayer;
        // applies the selected class for css
        uiLayerDiv.classList.add("selected");
        // updates the uiLayer array, to move the active uiLayer to the front of the array
        this._uiLayersOrder = this._uiLayersOrder.filter(item => item !== parseInt(uiLayerId));
        this._uiLayersOrder.unshift(parseInt(uiLayerId));
        // determines which of the current layers should be rendered (which should be this one)
        this._renderActiveUiLayer();
    }

    // determines which layer should be rendered by webGL, based on which layer is selected
    _renderActiveUiLayer = () => {
        // if there is currently a uiLayer
        if (this.activeUiLayer) {
            // render the pseudolayer of the active uiLayer
            const pseudoLayerToRender = this.activeUiLayer.pseudolayer;
            this._webgl.activatePseudolayer(pseudoLayerToRender);
        } else if (this._uiLayersOrder.length > 0) {
            // if it's the first layer to be added, render and set as active
            const uiLayerIdToActivate = this._uiLayersOrder[0];
            const uiLayerToActivate = this._uiLayers[uiLayerIdToActivate];
            const pseudoLayerToRender = uiLayerToActivate.pseudolayer;
            document.getElementById(uiLayerIdToActivate).classList.add("selected");
            this.activeUiLayer = uiLayerToActivate;
            this._webgl.activatePseudolayer(pseudoLayerToRender);
        } else {
            // otherwise stop rendering
            this._webgl.activatePseudolayer();
        }
    }

    // adds a gui to the correct position in the DOM -> accepts the html string of the gui
    _addGuiToDOM = (string) => {
        // creates an html element, appends the html then gets rid of the parent div
        var htmlElement = document.createElement("div");
        htmlElement.innerHTML = string;
        htmlElement = htmlElement.firstChild;
        // appends the div to the  correct place in the DOM
        const processingGui = document.getElementById("processing_gui");
        processingGui.style.visibility = "visible";
        const insertPoint = document.getElementById("processing_gui_actions");
        insertPoint.insertAdjacentElement('beforebegin', htmlElement);
        return htmlElement;
    }

    // removes the gui from the DOM
    removeGui = () => {
        // remove the gui placeholder
        const processingGui = document.getElementById("processing_gui");
        processingGui.style.visibility = "hidden";
        // remove the gui
        processingGui.removeChild(this.activeGui);
        // event listeners *should* be garbage collected
    }

    // this function reconstructs a pseudolayer from it's state, ignoring the state of the current gui. this is so that
    // when the parameters are changed by the gui, they are relative to the original pseudolayer, rather than any 
    // processing that has already been applied
    restoreGuiState = (uiLayer, thisGui) => {
        console.log("called")
        let guiOrder = {};
        let targetPseudolayer = uiLayer.originalPseudolayer;
        // save the order of the guis as the key, and the inputs as the values. then can loop through 1 - gui.length
        // and apply effects in the correct order
        for (let key of Object.keys(uiLayer.state)) {
            let processingPosition = uiLayer.state[key].guiOrder;
            // ignore any state set by the current gui. e.g if the function is called when opening the rgbaManipulation gui,
            // ignore any previous rgbaManipulation state when reconstructing the pseudolayer. this is so that any rgbaManipulation
            // processing is original to the original colours of the layer -> i.e if the layer has already been change to r = 1.5,
            // we don't want any future colouring to be stacked on top of that
            if (key === thisGui) {
                guiOrder[processingPosition] = false;
            } else {
                guiOrder[processingPosition] = uiLayer.state[key];
            }
        }
        // loop through guis in the order that effects have been applied, and re-apply all of the effects from the state
        for (let x = 0; x < Object.keys(guiOrder).length; x++){
            var inputArguments = guiOrder[x];
            if (inputArguments) {
                console.log("built something", inputArguments)
                // store the function name and pseudolayers outside of the object, since these can't (and don't need to be) deep copied
                const functionName = inputArguments.stateFunction;
                const inputPseudolayers = inputArguments.inputName;
                delete inputArguments.stateFunction;
                delete inputArguments.inputName;
                // deep copy the state variables -> prevents issues with mutation when state is changed by the guis
                var inputArguments = JSON.parse(JSON.stringify(inputArguments));
                // update the input arguments with the input pseudolayers
                for (let key of Object.keys(inputPseudolayers)) {
                    inputArguments[key] = inputPseudolayers[key];
                }
                console.log(inputPseudolayers)
                console.log(inputArguments)
                // inputArguments["webgl"] = this._webgl;
                // set the target pseudolayer as the pseudolayer that has just been built -> means next effects are stacked
                // on top of this pseudolayer
                targetPseudolayer = functionName(inputArguments);
            }
        }
        return targetPseudolayer;
    }

    // working template for setting up a gui -> comments here apply to all guis
    // these can all be minimised when developing -> they just build guis and add event handlers
    // todo add a description of how guis work... blah blah state blah blah
    rgbaManipulationGui = () => {
        const targetUiLayer = this.activeUiLayer;
        // check if the ui layer has been changed by this gui before -> if so, restore these values to populate gui
        // also need to record the number of this gui, so that processing can be re-applied in order
        if ("rgbaManipulation" in targetUiLayer.state) {
            var thisGuiNumber = targetUiLayer.state.guiOrder;
            var rgbam_multiplier = targetUiLayer.state.rgbaManipulation.rgbam_multiplier;
        } else {
            // store the position of this gui process - allows us to reconstruct the layer in the correct order
            var thisGuiNumber = targetUiLayer.state.guiOrder;
            var rgbam_multiplier = [1.0, 1.0, 1.0, 1.0];
        }

        // we now need to re-construct the target pseudolayer from it's state, maintaining order
        const targetPseudolayer = this.restoreGuiState(targetUiLayer, "rgbaManipulation");

        // generate gui -> can be unstyled, as will resize to fit generic gui container, or can be styled in guis.css
        const html = `<div id="rgbaManipulation" class="inner_gui">
                          <p class="gui_title">Multiply RGBA</p>
                          <p class="gui_text">Red: <span id="red_value">${rgbam_multiplier[0]}</span></p>
                          <input type="range" min="0" max="300" value="${rgbam_multiplier[0]*100}" class="gui_slider" id="red_slider">
                          <p class="gui_text">Green: <span id="green_value">${rgbam_multiplier[1]}</span></p>
                          <input type="range" min="0" max="300" value="${rgbam_multiplier[1]*100}" class="gui_slider" id="green_slider">
                          <p class="gui_text">Blue: <span id="blue_value">${rgbam_multiplier[2]}</span></p>
                          <input type="range" min="0" max="300" value="${rgbam_multiplier[2]*100}" class="gui_slider" id="blue_slider">
                      </div>`
        const gui = this._addGuiToDOM(html);
        this.activeGui = gui;

        // add event handlers -> these should be garbage collected when the gui is removed
        function addSliderEvent(sliderId, valueId, targetUiLayer, targetPseudolayer, ui) {
            document.getElementById(sliderId).oninput = () => {
                // get the input values from the sliders
                rgbam_multiplier[0] = document.getElementById("red_slider").value/100;
                rgbam_multiplier[1] = document.getElementById("green_slider").value/100;
                rgbam_multiplier[2] = document.getElementById("blue_slider").value/100;
                // update the text for the gui
                document.getElementById(valueId).innerHTML = document.getElementById(sliderId).value/100;
                let pseudolayer = ui._constructor.rgbaManipulation({
                    webgl: ui._webgl, 
                    rgbam_image: targetPseudolayer,
                    rgbam_multiplier: rgbam_multiplier,
                });
                ui.updateUiLayer(targetUiLayer, pseudolayer);

                // update the state of the layer
                targetUiLayer.state["rgbaManipulation"] = {
                    "rgbam_multiplier": rgbam_multiplier,
                    "inputName": {
                        "rgbam_image": pseudolayer
                    },
                    // the function to be called when rebuilding the layer
                    "stateFunction": this._constructor.rgbaManipulation,
                    // the order in which processing should be re-applied when constructing the layer
                    "guiOrder": thisGuiNumber,
                }
            }
        }

        addSliderEvent("red_slider", "red_value", targetUiLayer, targetPseudolayer, this);
        addSliderEvent("green_slider", "green_value", targetUiLayer, targetPseudolayer, this);
        addSliderEvent("blue_slider", "blue_value", targetUiLayer, targetPseudolayer, this);
    }

    rgbFilteringGui = () => {
        const targetUiLayer = this.activeUiLayer;
        if ("rgbFiltering" in targetUiLayer.state) {
            var thisGuiNumber = targetUiLayer.state.guiOrder;
            var rgbf_filter = targetUiLayer.state.rgbFiltering.rgbf_filter;
            var rgbf_removed = targetUiLayer.state.rgbFiltering.rgbf_removed;
            var rgbfd1_remove = targetUiLayer.state.rgbFiltering.rgbfd1_remove;
        } else {
            var thisGuiNumber = Object.keys(targetUiLayer.state).length;
            var rgbf_filter = [1.0, 1.0, 1.0];
            var rgbf_removed = [0.0, 0.0, 0.0, 1.0];
            var rgbfd1_remove = ">";
        }

        const targetPseudolayer = this.restoreGuiState(targetUiLayer, "rgbFiltering");

        const html = `<div id="rgbFiltering" class="inner_gui">
                          <p class="gui_title">Filter RGB</p>
                          <p class="gui_text">Value to filter:</p>
                          <p class="gui_text">Red: <span id="red_value">${rgbf_filter[0]*255}</span></p>
                          <input type="range" min="0" max="255" value="${rgbf_filter[0]*255}" class="gui_slider" id="red_slider">
                          <p class="gui_text">Green: <span id="green_value">${rgbf_filter[1]*255}</span></p>
                          <input type="range" min="0" max="255" value="${rgbf_filter[1]*255}" class="gui_slider" id="green_slider">
                          <p class="gui_text">Blue: <span id="blue_value">${rgbf_filter[2]*255}</span></p>
                          <input type="range" min="0" max="255" value="${rgbf_filter[2]*255}" class="gui_slider" id="blue_slider">
                          <p class="gui_text">Operator:</p>
                          <select name="operator" id="operator">
                            <option value="&gt" selected>&gt</option>
                            <option value="&lt">&lt</option>
                          </select><br><br>
                      </div>`
        const gui = this._addGuiToDOM(html);
        this.activeGui = gui;

        function addSliderEvent(sliderId, valueId, targetUiLayer, targetPseudolayer, ui) {
            document.getElementById(sliderId).oninput = () => {
                rgbf_filter[0] = document.getElementById("red_slider").value/255;
                rgbf_filter[1] = document.getElementById("green_slider").value/255;
                rgbf_filter[2] = document.getElementById("blue_slider").value/255;
                rgbfd1_remove = document.getElementById("operator").value;
                document.getElementById(valueId).innerHTML = document.getElementById(sliderId).value;
                let pseudolayer = ui._constructor.rgbFiltering({
                    webgl: ui._webgl, 
                    rgbf_image: targetPseudolayer, 
                    rgbf_filter: rgbf_filter, 
                    rgbf_removed: rgbf_removed, 
                    rgbfd1_remove: rgbfd1_remove
                });
                ui.updateUiLayer(targetUiLayer, pseudolayer);

                targetUiLayer.state["rgbFiltering"] = {
                    "rgbf_filter": rgbf_filter,
                    "rgbf_removed": rgbf_removed,
                    "rgbfd1_remove": rgbfd1_remove,
                    "inputName": {
                        "rgbf_image": targetPseudolayer
                    },
                    "stateFunction": this._constructor.rgbFiltering,
                    "guiOrder": thisGuiNumber,
                }
            }
        }

        addSliderEvent("red_slider", "red_value", targetUiLayer, targetPseudolayer, this);
        addSliderEvent("green_slider", "green_value", targetUiLayer, targetPseudolayer, this);
        addSliderEvent("blue_slider", "blue_value", targetUiLayer, targetPseudolayer, this);

        // event listener on operator to use
        document.getElementById("operator").onchange = () => {
            rgbf_filter[0] = document.getElementById("red_slider").value/255;
            rgbf_filter[1] = document.getElementById("green_slider").value/255;
            rgbf_filter[2] = document.getElementById("blue_slider").value/255;
            rgbfd1_remove = document.getElementById("operator").value;
            let pseudolayer = ui._constructor.rgbFiltering({
                webgl: ui._webgl, 
                rgbf_image: targetPseudolayer, 
                rgbf_filter: rgbf_filter, 
                rgbf_removed: rgbf_removed, 
                rgbfd1_remove: rgbfd1_remove
            });
            this.updateUiLayer(targetUiLayer, pseudolayer);

            targetUiLayer.state["rgbFiltering"] = {
                "rgbf_filter": rgbf_filter,
                "rgbf_removed": rgbf_removed,
                "rgbfd1_remove": rgbfd1_remove,
                "inputName": {
                    "rgbf_image": targetPseudolayer
                },
                "stateFunction": this._constructor.rgbFiltering,
                "guiOrder": thisGuiNumber,
            }
        }
    }

    rgbPercentageFilteringGui = () => {
        const targetUiLayer = this.activeUiLayer;
        if ("rgbPercentageFiltering" in targetUiLayer.state) {
            var thisGuiNumber = targetUiLayer.state.guiOrder;
            var rgbfp_filter = targetUiLayer.state.rgbPercentageFiltering.rgbfp_filter;
            var rgbfp_removed = targetUiLayer.state.rgbPercentageFiltering.rgbfp_removed;
            var rgbfpd1_remove = targetUiLayer.state.rgbPercentageFiltering.rgbfpd1_remove;
        } else {
            var thisGuiNumber = Object.keys(targetUiLayer.state).length;
            var rgbfp_filter = [1.0, 1.0, 1.0];
            var rgbfp_removed = [0.0, 0.0, 0.0, 1.0];
            var rgbfpd1_remove = ">";
        }

        const targetPseudolayer = this.restoreGuiState(targetUiLayer, "rgbPercentageFiltering");

        const html = `<div id="rgbPercentageFiltering" class="inner_gui">
                          <p class="gui_title">Filter RGB by %</p>
                          <p class="gui_text">Value to filter:</p>
                          <p class="gui_text">Red: <span id="red_value">${rgbfp_filter[0]*100}%</span></p>
                          <input type="range" min="0" max="100" value="${rgbfp_filter[0]*100}" class="gui_slider" id="red_slider">
                          <p class="gui_text">Green: <span id="green_value">${rgbfp_filter[1]*100}%</span></p>
                          <input type="range" min="0" max="100" value="${rgbfp_filter[1]*100}" class="gui_slider" id="green_slider">
                          <p class="gui_text">Blue: <span id="blue_value">${rgbfp_filter[2]*100}%</span></p>
                          <input type="range" min="0" max="100" value="${rgbfp_filter[2]*100}" class="gui_slider" id="blue_slider">
                          <p class="gui_text">Operator:</p>
                          <select name="operator" id="operator">
                            <option value="&gt" selected>&gt</option>
                            <option value="&lt">&lt</option>
                          </select><br><br>
                      </div>`
        const gui = this._addGuiToDOM(html);
        this.activeGui = gui;

        function addSliderEvent(sliderId, valueId, targetUiLayer, targetPseudolayer, ui) {
            document.getElementById(sliderId).oninput = () => {
                rgbfp_filter[0] = document.getElementById("red_slider").value/255;
                rgbfp_filter[1] = document.getElementById("green_slider").value/255;
                rgbfp_filter[2] = document.getElementById("blue_slider").value/255;
                rgbfpd1_remove = document.getElementById("operator").value;
                document.getElementById(valueId).innerHTML = document.getElementById(sliderId).value + "%";
                const pseudolayer = ui._constructor.rgbPercentageFiltering({
                    webgl: ui._webgl, 
                    rgbfp_image: targetPseudolayer, 
                    rgbfp_filter: rgbfp_filter, 
                    rgbfp_removed: rgbfp_removed, 
                    rgbfpd1_remove: rgbfpd1_remove
                });
                ui.updateUiLayer(targetUiLayer, pseudolayer);

                targetUiLayer.state["rgbPercentageFiltering"] = {
                    "rgbfp_filter": rgbfp_filter,
                    "rgbfp_removed": rgbfp_removed,
                    "rgbfpd1_remove": rgbfpd1_remove,
                    "inputName": {
                        "rgbfp_image": targetPseudolayer
                    },
                    "stateFunction": this._constructor.rgbPercentageFiltering,
                    "guiOrder": thisGuiNumber,
                }
            }
        }

        addSliderEvent("red_slider", "red_value", targetUiLayer, targetPseudolayer, this);
        addSliderEvent("green_slider", "green_value", targetUiLayer, targetPseudolayer, this);
        addSliderEvent("blue_slider", "blue_value", targetUiLayer, targetPseudolayer, this);

        // event listener on operator to use
        document.getElementById("operator").onchange = () => {
            rgbfp_filter[0] = document.getElementById("red_slider").value/255;
            rgbfp_filter[1] = document.getElementById("green_slider").value/255;
            rgbfp_filter[2] = document.getElementById("blue_slider").value/255;
            rgbfpd1_remove = document.getElementById("operator").value;
            const pseudolayer = this._constructor.rgbPercentageFiltering({
                webgl: this._webgl, 
                rgbfp_image: targetPseudolayer, 
                rgbfp_filter: state.rgbfp_filter, 
                rgbfp_removed: state.rgbfp_removed, 
                rgbfpd1_remove: state.rgbfpd1_remove
            });
            this.updateUiLayer(targetUiLayer, pseudolayer);

            targetUiLayer.state["rgbPercentageFiltering"] = {
                "rgbfp_filter": rgbfp_filter,
                "rgbfp_removed": rgbfp_removed,
                "rgbfpd1_remove": rgbfpd1_remove,
                "inputName": {
                    "rgbfp_image": targetPseudolayer
                },
                "stateFunction": this._constructor.rgbPercentageFiltering,
                "guiOrder": thisGuiNumber,
            }
        }
    }

    apply3x3KernelGui = () => {
        const targetUiLayer = this.activeUiLayer;
        if ("apply3x3Kernel" in targetUiLayer.state) {
            var thisGuiNumber = targetUiLayer.state.guiOrder;
            var a3k_kernel = targetUiLayer.state.apply3x3Kernel.a3k_kernel;
            var a3k_kernelWeight = targetUiLayer.state.apply3x3Kernel.multiplier;
        } else {
            var thisGuiNumber = Object.keys(targetUiLayer.state).length;
            var a3k_kernel = [1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0];
            var a3k_kernelWeight = 1.0;
        }
        
        const targetPseudolayer = this.restoreGuiState(targetUiLayer, "apply3x3Kernel");

        const html = `<div id="apply3x3Kernel" class="inner_gui">
                        <p class="gui_title">Apply 3x3 kernel</p>
                        <table id="kernel_table">
                            <tr>
                                <td><div class="kernel_input" data-index="0" contenteditable>${a3k_kernel[0]}</div></td>
                                <td><div class="kernel_input" data-index="1" contenteditable>${a3k_kernel[1]}</div></td>
                                <td><div class="kernel_input" data-index="2" contenteditable>${a3k_kernel[2]}</div></td>
                            </tr>
                            <tr>
                                <td><div class="kernel_input" data-index="3" contenteditable>${a3k_kernel[3]}</div></td>
                                <td><div class="kernel_input" data-index="4" contenteditable>${a3k_kernel[4]}</div></td>
                                <td><div class="kernel_input" data-index="5" contenteditable>${a3k_kernel[5]}</div></td>
                            </tr>
                            <tr>
                                <td><div class="kernel_input" data-index="6" contenteditable>${a3k_kernel[6]}</div></td>
                                <td><div class="kernel_input" data-index="7" contenteditable>${a3k_kernel[7]}</div></td>
                                <td><div class="kernel_input" data-index="8" contenteditable>${a3k_kernel[8]}</div></td>
                            </tr>
                        </table>
                        <p class="gui_text">Multiplier</p>
                        <input id="kernel_multiplier" type="number" min="1" max="16" value="${a3k_kernelWeight}">
                        <br><br>
                        <input id="apply_kernel" type="button" value="Apply">
                        <br><br>
                    </div>`
        const gui = this._addGuiToDOM(html);
        this.activeGui = gui;

        document.getElementById("apply_kernel").onclick = () => {
            const kernelInputs = document.getElementsByClassName("kernel_input");
            for (let x = 0; x < kernelInputs.length; x++) {
                const kernelInput = kernelInputs[x];
                const kernelInputIndex = parseInt(kernelInput.dataset.index);
                a3k_kernel[kernelInputIndex] = parseInt(kernelInput.innerHTML);
            }
            a3k_kernelWeight = parseInt(document.getElementById("kernel_multiplier").value);
            const pseudolayer = this._constructor.apply3x3Kernel({
                webgl: this._webgl, 
                a3k_image: targetPseudolayer, 
                a3k_kernel: a3k_kernel, 
                a3k_kernelWeight: a3k_kernelWeight
            });
            this.updateUiLayer(targetUiLayer, pseudolayer);

            targetUiLayer.state["apply3x3Kernel"] = {
                "a3k_kernel": a3k_kernel,
                "a3k_kernelWeight": a3k_kernelWeight,
                "inputName": {
                    "a3k_image": targetPseudolayer
                },
                "stateFunction": this._constructor.apply3x3Kernel,
                "guiOrder": thisGuiNumber,
            }
        }
    }

    sobelEdgeDetection = () => {
        const targetUiLayer = this.activeUiLayer;
        if ("sobelEdgeDetection" in targetUiLayer.state) {
            var thisGuiNumber = targetUiLayer.state.guiOrder;
        } else {
            var thisGuiNumber = Object.keys(targetUiLayer.state).length;
        }

        const targetPseudolayer = this.restoreGuiState(targetUiLayer, "sobelEdgeDetection");

        const html = `<div id="sobelEdgeDetection" class="inner_gui">
                          <p class="gui_title">Apply sobel edge detection</p>
                          <input id="apply_sobel" type="button" value="Apply">
                          <br><br>
                      </div>`
        const gui = this._addGuiToDOM(html);
        this.activeGui = gui;

        document.getElementById("apply_sobel").onclick = () => {
            const pseudolayer = this._constructor.sobelEdgeDetection({
                webgl: this._webgl, 
                sed_image: targetPseudolayer, 
            });
            this.updateUiLayer(targetUiLayer, pseudolayer);

            targetUiLayer.state["sobelEdgeDetection"] = {
                "inputName": {
                    "sed_image": targetPseudolayer
                },
                "stateFunction": this._constructor.sobelEdgeDetection,
                "guiOrder": thisGuiNumber,
            }
        }
    }

    greyscale = () => {
        const targetUiLayer = this.activeUiLayer;
        if ("greyscale" in targetUiLayer.state) {
            var thisGuiNumber = targetUiLayer.state.guiOrder;
        } else {
            var thisGuiNumber = Object.keys(targetUiLayer.state).length;
        }

        const targetPseudolayer = this.restoreGuiState(targetUiLayer, "greyscale");

        const html = `<div id="greyscale" class="inner_gui">
                          <p class="gui_title">Apply greyscale</p>
                          <input id="apply_greyscale" type="button" value="Apply">
                          <br><br>
                      </div>`
        const gui = this._addGuiToDOM(html);
        this.activeGui = gui;

        document.getElementById("apply_greyscale").onclick = () => {
            const pseudolayer = this._constructor.greyscale({
                webgl: this._webgl, 
                gs_image: targetPseudolayer,
            })
            this.updateUiLayer(targetUiLayer, pseudolayer);

            targetUiLayer.state["greyscale"] = {
                "inputName": {
                    "gs_image": targetPseudolayer
                },
                "stateFunction": this._constructor.greyscale,
                "guiOrder": thisGuiNumber,
            }
        }
    }

    stackLayers = () => {
        const targetUiLayer = this.activeUiLayer;
        if ("stackLayers" in targetUiLayer.state) {
            var thisGuiNumber = targetUiLayer.state.guiOrder;
        } else {
            var thisGuiNumber = Object.keys(targetUiLayer.state).length;
        }

        if ("stackLayers" in targetUiLayer.state) {
            var sl1_weight = targetUiLayer.state.stackLayers.sl1_weight;
            var sl2_weight = targetUiLayer.state.stackLayers.sl2_weight;
            var sl_multiplier = targetUiLayer.state.stackLayers.sl_multiplier;
        } else {
            var sl1_weight = 1.0;
            var sl2_weight = 1.0;
            var sl_multiplier = 2.0;
        }

        const targetPseudolayer1 = this.restoreGuiState(targetUiLayer, "stackLayers");

        // get all of the available layers for the second layer dropdown
        var layerOptions = "";
        for (let key of Object.keys(this._uiLayers)) {
            let uiLayer = this._uiLayers[key];
            layerOptions += `<option id=${uiLayer.id}>${uiLayer.name}</option>`
        }

        const html = `<div id="rgbaManipulation" class="inner_gui">
                          <p class="gui_title">Stack layers</p>
                          <p class="gui_text">This layer weight:</p>
                          <input id="layer1_weight" type="number" min="1" max="5" value="${sl1_weight}">
                          <p class="gui_text">Layer 2 input:</p>
                          <select id="layer2_dropdown">
                              ${layerOptions}
                          </select>
                          <p class="gui_text">Layer 2 weight:</p>
                          <input id="layer2_weight" type="number" min="1" max="5" value="${sl2_weight}">
                          <p class="gui_text">Multiplier:</p>
                          <input id="stack_layers_multiplier" type="number" min="1" max="5" value="${sl_multiplier}">
                          <br><br>
                          <input id="apply_stack_layers" type="button" value="Apply">
                          <br><br>
                      </div>`
        const gui = this._addGuiToDOM(html);
        this.activeGui = gui;

        document.getElementById("apply_stack_layers").onclick = () => {
            // first we need to reconstruct the selected ui layer
            let selectElement = document.getElementById("layer2_dropdown");
            let selectedElementId = selectElement[selectElement.selectedIndex].id;
            let layer2 = this._uiLayers[selectedElementId];
            const targetPseudolayer2 = this.restoreGuiState(layer2, "stackLayers")
            // then get input values
            sl1_weight = parseInt(document.getElementById("layer1_weight").value);
            sl2_weight = parseInt(document.getElementById("layer2_weight").value);
            sl_multiplier = parseInt(document.getElementById("stack_layers_multiplier").value);
            const pseudolayer = this._constructor.stackLayers({
                webgl: this._webgl,
                sl1_image: targetPseudolayer1,
                sl2_image: targetPseudolayer2,
                sl1_weight: sl1_weight,
                sl2_weight: sl2_weight,
                sl_multiplier: sl_multiplier,
            })
            this.updateUiLayer(targetUiLayer, pseudolayer);

            targetUiLayer.state["stackLayers"] = {
                "sl1_weight": sl1_weight,
                "sl2_weight": sl2_weight,
                "sl_multiplier": sl_multiplier,
                "inputName": {
                    "sl1_image": targetPseudolayer1, 
                    "sl2_image": targetPseudolayer2,
                },
                "stateFunction": this._constructor.stackLayers,
                "guiOrder": thisGuiNumber,
            }
        }
    }
}