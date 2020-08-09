export class UiLayer{
    constructor(pseudolayer, layerNumber) {
        // same id as the pseudolayer
        this.id = pseudolayer.id;
        // the pseudolayer -> is updated if the layer is updated
        this.pseudolayer = pseudolayer;
        // the original layer -> should never change
        this.originalPseudolayer = pseudolayer;
        // whether the layer is currently visible on the WebGLCanvas
        this.visible = true;
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
        if (this.uiLayersOrder.length > 0) {
            const newActiveUiLayer = this.uiLayersOrder[0];
            // sets the active layer
            this.activeUiLayer = newActiveUiLayer;
            // update the css
            document.getElementById(newActiveUiLayer).classList.add("selected");
        } else {
            this.activeUiLayer = false;
        }
        // deletes the uiLayer from the DOM
        document.getElementById(toDelete).remove();
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
            elements[x].classList.remove("selected");
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
            const uiLayerToActivate = this.uiLayers[this.uiLayersOrder[0]];
            const pseudoLayerToRender = uiLayerToActivate.pseudolayer;
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
        // remove the gui placeholder
        const processingGui = document.getElementById("processing_gui");
        processingGui.style.visibility = "hidden";
        // remove the gui
        processingGui.removeChild(this.activeGui);
        // event listeners *should* be garbage collected
        this.activeGui = false;
    }

    // working template for setting up a gui
    rgbaManipulationGui = () => {
        const targetLayer = this.activeUiLayer;

        // check if the ui layer has been changed by this gui before -> if so, restore these values
        if ("rgbaManipulation" in targetLayer.state) {
            var red = targetLayer.state.rgbaManipulation.red;
            var green = targetLayer.state.rgbaManipulation.green;
            var blue = targetLayer.state.rgbaManipulation.blue;
            var alpha = targetLayer.state.rgbaManipulation.alpha;
        } else {
            var red = 1.0;
            var green = 1.0;
            var blue = 1.0;
            var alpha = 1.0;
            targetLayer.state["rgbaManipulation"] = {
                "red": red,
                "green": green,
                "blue": blue,
                "alpha": alpha
            }
        }

        // generate gui -> can be unstyled, as will resize to fit generic gui container, or can be styled in guis.css
        const html = `<div id="rgbaManipulation" class="inner_gui">
                          <p class="gui_title">Change RGBA</p>
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
        function addSliderEvent(sliderId, valueId, colour, targetLayer, ui) {
            document.getElementById(sliderId).oninput = () => {
                const state = targetLayer.state.rgbaManipulation;
                const thisSlider = document.getElementById(sliderId);
                state[colour] = thisSlider.value/100;
                document.getElementById(valueId).innerHTML = thisSlider.value/100;
                const targetPseudoLayer = targetLayer.originalPseudolayer;
                const pseudolayer = ui.constructor.rgbaManipulation(ui.webgl, targetPseudoLayer, [state.red, state.green, state.blue, state.alpha]);
                ui.updateUiLayer(targetLayer, pseudolayer);
            }
        }

        addSliderEvent("red_slider", "red_value", "red", targetLayer, this);
        addSliderEvent("green_slider", "green_value", "green", targetLayer, this);
        addSliderEvent("blue_slider", "blue_value", "blue", targetLayer, this);
    }

    rgbFilteringGui = () => {
        const targetLayer = this.activeUiLayer;

        if ("rgbFiltering" in targetLayer.state) {
            var filter = targetLayer.state.rgbFiltering.filter;
            var colour = targetLayer.state.rgbFiltering.colour;
            var operator = targetLayer.state.rgbFiltering.operator;
        } else {
            var filter = 1.0;
            var colour = "r";
            var operator = "<";
            targetLayer.state["rgbFiltering"] = {
                "filter": filter,
                "colour": colour,
                "operator": operator,
            }
        }

        const html = `<div id="rgbFiltering" class="inner_gui">
                          <p class="gui_title">Filter RGB</p>
                          <p class="gui_text">Value to filter:</p>
                          <select name="filter_colour" id="filter_colour">
                            <option value="r" selected>Red</option>
                            <option value="g">Green</option>
                            <option value="b">Blue</option>
                          </select>
                          <p class="gui_text">Value to filter: <span id="filter_value">${filter}</span></p>
                          <input type="range" min="0" max="250" value="${filter*100}" class="gui_slider" id="filter_slider">
                          <p class="gui_text">Operator:</p>
                          <select name="operator" id="operator">
                            <option value="&lt" selected>&lt</option>
                            <option value="&gt">&gt</option>
                          </select><br><br>
                      </div>`
        const gui = this._addGuiToDOM(html);
        this.activeGui = gui;

        // event listener on colour to be filtered
        document.getElementById("filter_colour").onchange = () => {
            const state = targetLayer.state.rgbFiltering;
            const thisInput = document.getElementById("filter_colour");
            state.colour = thisInput.value;
            const targetPseudoLayer = targetLayer.originalPseudolayer;
            const pseudolayer = this.constructor.rgbFiltering(this.webgl, targetPseudoLayer, state.filter, [0.0, 0.0, 0.0, 1.0], state.colour, state.operator);
            this.updateUiLayer(targetLayer, pseudolayer);
        }

        // event listener on filter value
        document.getElementById("filter_slider").oninput = () => {
            const state = targetLayer.state.rgbFiltering;
            const thisSlider = document.getElementById("filter_slider");
            state.filter = thisSlider.value/100;
            document.getElementById("filter_value").innerHTML = thisSlider.value/100;
            const targetPseudoLayer = targetLayer.originalPseudolayer;
            const pseudolayer = this.constructor.rgbFiltering(this.webgl, targetPseudoLayer, state.filter, [0.0, 0.0, 0.0, 1.0], state.colour, state.operator);
            this.updateUiLayer(targetLayer, pseudolayer);
        }

        // event listener on operator to use
        document.getElementById("operator").onchange = () => {
            const state = targetLayer.state.rgbFiltering;
            const thisInput = document.getElementById("operator");
            state.operator = thisInput.value;
            const targetPseudoLayer = targetLayer.originalPseudolayer;
            const pseudolayer = this.constructor.rgbFiltering(this.webgl, targetPseudoLayer, state.filter, [0.0, 0.0, 0.0, 1.0], state.colour, state.operator);
            this.updateUiLayer(targetLayer, pseudolayer);
        }
    }
}