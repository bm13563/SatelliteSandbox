export class UiLayer{
    constructor(pseudolayer, layerNumber) {
        // same id as the pseudolayer, can be used to get the DOM element, the pseudolayer or the uiLayer by id. 
        this.id = pseudolayer.id;
        // the pseudolayer that is rendered -> updated every time a parameter is updated. reset to originalPseudolayer on reset.
        this.pseudolayer = pseudolayer;
        // the current base pseudolayer -> updated every time a gui is closed (to save state from last gui). reset to originalPseudolayer on reset.
        // provides a point of reference for updating a pseudolayer -> don't want it to update off itself every time or the effects will stack
        this.basePseudolayer = pseudolayer;
        // the original layer -> should never change
        this.originalPseudolayer = pseudolayer;
        // tracks state for all of the guis -> checked whenever a gui is initialised, so the gui can have the
        // same value as the last input by the user
        this.state = {};
        // html required to add the layer to the layer panel of the ui
        const html = `<div class="layer" id="${this.id}" data-id="${this.id}">
                        <button class="delete_layer" data-id="${this.id}">&#10060</button>
                        <span id="Test layer ${layerNumber}" class="layer_text" data-id="${this.id}">Test layer ${layerNumber}</span>
                     </div>`
        this.html = document.createElement("div");
        this.html.innerHTML = html;
    }
}

export class Ui {
    constructor(webgl, constructor) {
        // the WebGLCanvas object
        this.webgl = webgl;
        // constructors for the shader programs
        this.constructor = constructor;
        // object where keys are the id of the uiLayer, and the property is the uiLayer
        this.uiLayers = {};
        // ordered array -> first element in this array is the pseudolayer that is rendered
        this.uiLayersOrder = [];
        // which layer is currently selected on the ui, and therefore is the target of any processing
        this.activeUiLayer = false;
        // which, if any, gui is currently rendered on the screen
        this.activeGui = false;
        // an object containing the methods that need to be called when a gui is to be opened
        this.guis = {
            "rgbaManipulation": this.rgbaManipulationGui,
            "rgbFiltering": this.rgbFilteringGui,
            "rgbPercentageFiltering": this.rgbPercentageFilteringGui,
            "apply3x3Kernel": this.apply3x3KernelGui,
        }
    }

    // add a pseudolayer to the ui, generating a new uiLayer. this uiLayer is added to the end 
    // of the existing uiLayers
    addUiLayer = (pseudolayer) => {
        // the number of the uiLayer -> for naming
        const layerNumber = this.uiLayersOrder.length + 1;
        // creates a new uiLayer
        const uiLayer = new UiLayer(pseudolayer, layerNumber);
        // adds the uiLayer to the layer tracker, where the uiLayer can directly be called via the id of the layer
        this.uiLayers[uiLayer.id] = uiLayer;
        // update the uiLayersOrder -> adds to the end by default, therefore this layer is rendered last
        this.uiLayersOrder.push(uiLayer.id);
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
        delete this.uiLayers[uiLayerDeleteId];
        // removes the uiLayer from uiLayersOrder array
        this.uiLayersOrder = this.uiLayersOrder.filter(item => item !== parseInt(uiLayerDeleteId));
        // updates the active uiLayer with the first element in the uiLayersOrder array if a uiLayer exists
        console.log(this.uiLayersOrder)
        if (this.uiLayersOrder.length > 0) {
            const newActiveUiLayerId = this.uiLayersOrder[0];
            const newActiveUiLayer = this.uiLayers[newActiveUiLayerId];
            // sets the active layer
            this.activeUiLayer = newActiveUiLayer;
            // update the css
            document.getElementById(newActiveUiLayerId).classList.add("selected");
        } else {
            this.activeUiLayer = false;
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
        // sets the pseudolayer of the uiLayer and the base uiLayer to the original pseudolayer
        this.activeUiLayer.pseudolayer = this.activeUiLayer.originalPseudolayer;
        this.activeUiLayer.basePseudolayer = this.activeUiLayer.originalPseudolayer;
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
        const uiLayer = this.uiLayers[uiLayerId];
        // set the layer as the active uiLayer
        this.activeUiLayer = uiLayer;
        // applies the selected class for css
        uiLayerDiv.classList.add("selected");
        // updates the uiLayer array, to move the active uiLayer to the front of the array
        this.uiLayersOrder = this.uiLayersOrder.filter(item => item !== parseInt(uiLayerId));
        this.uiLayersOrder.unshift(parseInt(uiLayerId));
        // determines which of the current layers should be rendered (which should be this one)
        this._renderActiveUiLayer();
    }

    // determines which layer should be rendered by webGL, based on which layer is selected
    _renderActiveUiLayer = () => {
        // if there is currently a uiLayer
        if (this.activeUiLayer) {
            // render the pseudolayer of the active uiLayer
            const pseudoLayerToRender = this.activeUiLayer.pseudolayer;
            this.webgl.renderPseudoLayer(pseudoLayerToRender, 5);
        } else if (this.uiLayersOrder.length > 0) {
            // if it's the first layer to be added, render and set as active
            const uiLayerIdToActivate = this.uiLayersOrder[0];
            const uiLayerToActivate = this.uiLayers[uiLayerIdToActivate];
            const pseudoLayerToRender = uiLayerToActivate.pseudolayer;
            document.getElementById(uiLayerIdToActivate).classList.add("selected");
            this.activeUiLayer = uiLayerToActivate;
            this.webgl.renderPseudoLayer(pseudoLayerToRender, 5);
        } else {
            // otherwise stop rendering
            this.webgl.stopRendering();
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
        // update the base pseudolayer, to maintain state when changing guis
        this.activeUiLayer.basePseudolayer = this.activeUiLayer.pseudolayer
        // remove the gui placeholder
        const processingGui = document.getElementById("processing_gui");
        processingGui.style.visibility = "hidden";
        // remove the gui
        processingGui.removeChild(this.activeGui);
        // event listeners *should* be garbage collected
        this.activeGui = false;
    }

    // working template for setting up a gui -> comments here apply to all guis
    rgbaManipulationGui = () => {
        const targetUiLayer = this.activeUiLayer;

        // check if the ui layer has been changed by this gui before -> if so, restore these values
        if ("rgbaManipulation" in targetUiLayer.state) {
            var red = targetUiLayer.state.rgbaManipulation.red;
            var green = targetUiLayer.state.rgbaManipulation.green;
            var blue = targetUiLayer.state.rgbaManipulation.blue;
            var alpha = targetUiLayer.state.rgbaManipulation.alpha;
        } else {
            var red = 1.0;
            var green = 1.0;
            var blue = 1.0;
            var alpha = 1.0;
            targetUiLayer.state["rgbaManipulation"] = {
                "red": red,
                "green": green,
                "blue": blue,
                "alpha": alpha
            }
        }

        // generate gui -> can be unstyled, as will resize to fit generic gui container, or can be styled in guis.css
        const html = `<div id="rgbaManipulation" class="inner_gui">
                          <p class="gui_title">Multiply RGBA</p>
                          <p class="gui_text">Red: <span id="red_value">${red}</span></p>
                          <input type="range" min="0" max="500" value="${red*100}" class="gui_slider" id="red_slider">
                          <p class="gui_text">Green: <span id="green_value">${green}</span></p>
                          <input type="range" min="0" max="500" value="${green*100}" class="gui_slider" id="green_slider">
                          <p class="gui_text">Blue: <span id="blue_value">${blue}</span></p>
                          <input type="range" min="0" max="500" value="${blue*100}" class="gui_slider" id="blue_slider">
                      </div>`
        const gui = this._addGuiToDOM(html);
        this.activeGui = gui;

        // add event handlers -> these should be garbage collected when the gui is removed
        function addSliderEvent(sliderId, valueId, colour, targetUiLayer, ui) {
            document.getElementById(sliderId).oninput = () => {
                const state = targetUiLayer.state.rgbaManipulation;
                const thisSlider = document.getElementById(sliderId);
                state[colour] = thisSlider.value/100;
                document.getElementById(valueId).innerHTML = thisSlider.value/100;
                const targetPseudoLayer = targetUiLayer.basePseudolayer;
                const pseudolayer = ui.constructor.rgbaManipulation(ui.webgl, targetPseudoLayer, [state.red, state.green, state.blue, state.alpha]);
                ui.updateUiLayer(targetUiLayer, pseudolayer);
            }
        }

        addSliderEvent("red_slider", "red_value", "red", targetUiLayer, this);
        addSliderEvent("green_slider", "green_value", "green", targetUiLayer, this);
        addSliderEvent("blue_slider", "blue_value", "blue", targetUiLayer, this);
    }

    rgbFilteringGui = () => {
        const targetUiLayer = this.activeUiLayer;

        if ("rgbFiltering" in targetUiLayer.state) {
            var red = targetUiLayer.state.rgbFiltering.red;
            var green = targetUiLayer.state.rgbFiltering.rgreened;
            var blue = targetUiLayer.state.rgbFiltering.blue;
            var operator = targetUiLayer.state.rgbFiltering.operator;
        } else {
            var red = 1.0;
            var green = 1.0;
            var blue = 1.0;
            var operator = ">";
            targetUiLayer.state["rgbFiltering"] = {
                "red": red,
                "green": green,
                "blue": blue,
                "operator": operator,
            }
        }

        const html = `<div id="rgbFiltering" class="inner_gui">
                          <p class="gui_title">Filter RGB</p>
                          <p class="gui_text">Value to filter:</p>
                          <p class="gui_text">Red: <span id="red_value">${red*255}</span></p>
                          <input type="range" min="0" max="255" value="${red*255}" class="gui_slider" id="red_slider">
                          <p class="gui_text">Green: <span id="green_value">${green*255}</span></p>
                          <input type="range" min="0" max="255" value="${green*255}" class="gui_slider" id="green_slider">
                          <p class="gui_text">Blue: <span id="blue_value">${blue*255}</span></p>
                          <input type="range" min="0" max="255" value="${blue*255}" class="gui_slider" id="blue_slider">
                          <p class="gui_text">Operator:</p>
                          <select name="operator" id="operator">
                            <option value="&gt" selected>&lt</option>
                            <option value="&lt">&gt</option>
                          </select><br><br>
                      </div>`
        const gui = this._addGuiToDOM(html);
        this.activeGui = gui;

        function addSliderEvent(sliderId, valueId, colour, targetUiLayer, ui) {
            document.getElementById(sliderId).oninput = () => {
                const state = targetUiLayer.state.rgbFiltering;
                const thisSlider = document.getElementById(sliderId);
                state[colour] = thisSlider.value/255;
                document.getElementById(valueId).innerHTML = thisSlider.value;
                const targetPseudoLayer = targetUiLayer.basePseudolayer;
                const pseudolayer = ui.constructor.rgbFiltering(ui.webgl, targetPseudoLayer, [state.red, state.green, state.blue], [0.0, 0.0, 0.0, 1.0], state.operator);
                ui.updateUiLayer(targetUiLayer, pseudolayer);
            }
        }

        addSliderEvent("red_slider", "red_value", "red", targetUiLayer, this);
        addSliderEvent("green_slider", "green_value", "green", targetUiLayer, this);
        addSliderEvent("blue_slider", "blue_value", "blue", targetUiLayer, this);

        // event listener on operator to use
        document.getElementById("operator").onchange = () => {
            const state = targetUiLayer.state.rgbFiltering;
            const thisInput = document.getElementById("operator");
            state.operator = thisInput.value;
            const targetPseudoLayer = targetUiLayer.basePseudolayer;
            const pseudolayer = this.constructor.rgbFiltering(this.webgl, targetPseudoLayer, [state.red, state.green, state.blue], [0.0, 0.0, 0.0, 1.0], state.operator);
            this.updateUiLayer(targetUiLayer, pseudolayer);
        }
    }

    rgbPercentageFilteringGui = () => {
        const targetUiLayer = this.activeUiLayer;

        if ("rgbPercentageFiltering" in targetUiLayer.state) {
            var red = targetUiLayer.state.rgbPercentageFiltering.red;
            var green = targetUiLayer.state.rgbPercentageFiltering.rgreened;
            var blue = targetUiLayer.state.rgbPercentageFiltering.blue;
            var operator = targetUiLayer.state.rgbPercentageFiltering.operator;
        } else {
            var red = 1.0;
            var green = 1.0;
            var blue = 1.0;
            var operator = ">";
            targetUiLayer.state["rgbPercentageFiltering"] = {
                "red": red,
                "green": green,
                "blue": blue,
                "operator": operator,
            }
        }

        const html = `<div id="rgbPercentageFiltering" class="inner_gui">
                          <p class="gui_title">Filter RGB by %</p>
                          <p class="gui_text">Value to filter:</p>
                          <p class="gui_text">Red: <span id="red_value">${red*100}%</span></p>
                          <input type="range" min="0" max="100" value="${red*100}" class="gui_slider" id="red_slider">
                          <p class="gui_text">Green: <span id="green_value">${green*100}%</span></p>
                          <input type="range" min="0" max="100" value="${green*100}" class="gui_slider" id="green_slider">
                          <p class="gui_text">Blue: <span id="blue_value">${blue*100}%</span></p>
                          <input type="range" min="0" max="100" value="${blue*100}" class="gui_slider" id="blue_slider">
                          <p class="gui_text">Operator:</p>
                          <select name="operator" id="operator">
                            <option value="&gt" selected>&lt</option>
                            <option value="&lt">&gt</option>
                          </select><br><br>
                      </div>`
        const gui = this._addGuiToDOM(html);
        this.activeGui = gui;

        function addSliderEvent(sliderId, valueId, colour, targetUiLayer, ui) {
            document.getElementById(sliderId).oninput = () => {
                const state = targetUiLayer.state.rgbPercentageFiltering;
                const thisSlider = document.getElementById(sliderId);
                state[colour] = thisSlider.value/100;
                document.getElementById(valueId).innerHTML = thisSlider.value + "%";
                const targetPseudoLayer = targetUiLayer.basePseudolayer;
                const pseudolayer = ui.constructor.rgbPercentageFiltering(ui.webgl, targetPseudoLayer, [state.red, state.green, state.blue], [0.0, 0.0, 0.0, 1.0], state.operator);
                ui.updateUiLayer(targetUiLayer, pseudolayer);
            }
        }

        addSliderEvent("red_slider", "red_value", "red", targetUiLayer, this);
        addSliderEvent("green_slider", "green_value", "green", targetUiLayer, this);
        addSliderEvent("blue_slider", "blue_value", "blue", targetUiLayer, this);

        // event listener on operator to use
        document.getElementById("operator").onchange = () => {
            const state = targetUiLayer.state.rgbPercentageFiltering;
            const thisInput = document.getElementById("operator");
            state.operator = thisInput.value;
            const targetPseudoLayer = targetUiLayer.basePseudolayer;
            const pseudolayer = this.constructor.rgbFiltering(this.webgl, targetPseudoLayer, [state.red, state.green, state.blue], [0.0, 0.0, 0.0, 1.0], state.operator);
            this.updateUiLayer(targetUiLayer, pseudolayer);
        }
    }

    apply3x3KernelGui = () => {
        const targetUiLayer = this.activeUiLayer;

        if ("apply3x3Kernel" in targetUiLayer.state) {
            var kernel = targetUiLayer.state.apply3x3Kernel.kernel;
            var multiplier = targetUiLayer.state.apply3x3Kernel.multiplier;
        } else {
            var kernel = [1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0];
            var multiplier = 1.0;
            targetUiLayer.state["apply3x3Kernel"] = {
                "kernel": kernel,
                "multiplier": multiplier,
            }
        }

        const html = `<div id="apply3x3Kernel" class="inner_gui">
                        <p class="gui_title">Apply 3x3 kernel</p>
                        <table id="kernel_table">
                            <tr>
                                <td><div class="kernel_input" data-index="0" contenteditable>${kernel[0]}</div></td>
                                <td><div class="kernel_input" data-index="1" contenteditable>${kernel[1]}</div></td>
                                <td><div class="kernel_input" data-index="2" contenteditable>${kernel[2]}</div></td>
                            </tr>
                            <tr>
                                <td><div class="kernel_input" data-index="3" contenteditable>${kernel[3]}</div></td>
                                <td><div class="kernel_input" data-index="4" contenteditable>${kernel[4]}</div></td>
                                <td><div class="kernel_input" data-index="5" contenteditable>${kernel[5]}</div></td>
                            </tr>
                            <tr>
                                <td><div class="kernel_input" data-index="6" contenteditable>${kernel[6]}</div></td>
                                <td><div class="kernel_input" data-index="7" contenteditable>${kernel[7]}</div></td>
                                <td><div class="kernel_input" data-index="8" contenteditable>${kernel[8]}</div></td>
                            </tr>
                        </table>
                        <p class="gui_text">Multiplier</p>
                        <input id="kernel_multiplier" type="number" min="1" max="16" value="${multiplier}">
                        <br><br>
                        <input id="apply_kernel" type="button" value="Apply">
                        <br><br>
                    </div>`
        const gui = this._addGuiToDOM(html);
        this.activeGui = gui;

        document.getElementById("apply_kernel").onclick = () => {
            const state = targetUiLayer.state.apply3x3Kernel;
            const kernelInputs = document.getElementsByClassName("kernel_input");
            for (let x = 0; x < kernelInputs.length; x++) {
                const kernelInput = kernelInputs[x];
                const kernelInputIndex = parseInt(kernelInput.dataset.index);
                state.kernel[kernelInputIndex] = parseInt(kernelInput.innerHTML);
            }
            console.log(state.kernel);
            state.multiplier = document.getElementById("kernel_multiplier").value;
            const targetPseudoLayer = targetUiLayer.basePseudolayer;
            const pseudolayer = this.constructor.apply3x3Kernel(this.webgl, targetPseudoLayer, state.kernel, state.multiplier);
            this.updateUiLayer(targetUiLayer, pseudolayer);
        }
    }
}