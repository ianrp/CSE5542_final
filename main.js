//Variables
var gl;
var program;
var vrDisplay;
var frameData = new VRFrameData();
var vrSceneFrame;
var inVR = false;
var perspectiveMatrix = perspective(45, 640.0/480.0, 0.1, 100.0);
var vertices;
var vertex_colors;
var indices;

function send_to_gpu(array)
{
	var buffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
	gl.bufferData(gl.ARRAY_BUFFER, flatten(array), gl.STATIC_DRAW);
}

function send_and_bind(array, var_name)
{
	send_to_gpu(array);
	var vPosition_location = gl.getAttribLocation(program, var_name);
	gl.vertexAttribPointer(vPosition_location, 3, gl.FLOAT, false, 0, 0);
	gl.enableVertexAttribArray(vPosition_location);
}

function toggle_vr_display()
{
	console.log("Toggling VR.");
	if (!inVR) {
		vrDisplay.requestPresent([{source: canvas}]).then(function() {
		
			var leftEye = vrDisplay.getEyeParameters('left');
			var rightEye = vrDisplay.getEyeParameters('right');

			canvas.width = Math.max(leftEye.renderWidth, rightEye.renderWidth) * 2;
			canvas.height = Math.max(leftEye.renderHeight, rightEye.renderHeight);

			//Draw vr scene
			drawVRScene();
		});
	}

	inVR = !inVR;
}

function drawVRScene()
{
	//Request the next frame of animation
	vrSceneFrame = vrDisplay.requestAnimationFrame(drawVRScene);

	//Get frame data
	vrDisplay.getFrameData(frameData);

	var curFramePose = frameData.pose;
	var curPos = curFramePose.position;
	var curOrient = curFramePose.orientation;

	gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

	//Obtain references to the shader variables for the matricies
	var viewMatrixLocation = gl.getUniformLocation(program, "view_matrix");
	var projectionMatrixLocation = gl.getUniformLocation(program, "proj_matrix");

	//Render the left eye's view
	gl.viewport(0, 0, canvas.width * 0.5, canvas.height);

	//Get the left eye's view and projection matrices
	var leftViewMat = frameData.leftViewMatrix;
	var leftProjMat = frameData.leftProjectionMatrix;

	//Send these matrices to the GPU
	gl.uniformMatrix4fv(viewMatrixLocation, false, leftViewMat);
	gl.uniformMatrix4fv(projectionMatrixLocation, false, leftProjMat);

	//Draw the geometry	
	gl.drawElements(gl.TRIANGLES, indices.length, gl.UNSIGNED_BYTE, 0);

	//Render the right eye's view
	gl.viewport(canvas.width * 0.5, 0, canvas.width * 0.5, canvas.height);

	//Get the right eye's view and projection matrices
	var rightViewMat = frameData.rightViewMatrix;
	var rightProjMat = frameData.rightProjectionMatrix;

	//Send these to the GPU
	gl.uniformMatrix4fv(viewMatrixLocation, false, rightViewMat);
	gl.uniformMatrix4fv(projectionMatrixLocation, false, rightProjMat);

	//Draw the geometry
	gl.drawElements(gl.TRIANGLES, indices.length, gl.UNSIGNED_BYTE, 0);

	//Send the frame to the HMD
	vrDisplay.submitFrame();
}

//Get a reference to the canvas and max out its size
var canvas = document.getElementById("gl-canvas");
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

//Create and initialize the WebGL context
gl = WebGLUtils.setupWebGL(canvas);
if (!gl) {
	alert("WebGL is not supported by your system.");
}
gl.clearColor(0.0, 0.0, 0.0, 1.0);
gl.clearDepth(1.0);
gl.enable(gl.DEPTH_TEST);
gl.depthFunc(gl.LEQUAL);
gl.clear(gl.COLOR_BUFFER_BIT);

//Compile the shaders
program = initShaders(gl, "vertex-shader", "fragment-shader");
gl.useProgram(program);

//Array of cube vertices
vertices = [
	vec3(-0.5, -0.5, 0.5),
	vec3(-0.5, 0.5, 0.5),
	vec3(0.5, 0.5, 0.5),
	vec3(0.5, -0.5, 0.5),
	vec3(-0.5, -0.5, -0.5),
	vec3(-0.5, 0.5, -0.5),
	vec3(0.5, 0.5, -0.5),
	vec3(0.5, -0.5, -0.5)
];

vertex_colors = [
	vec4(0.0, 0.0, 0.0, 1.0),
	vec4(1.0, 0.0, 0.0, 1.0),
	vec4(1.0, 1.0, 0.0, 1.0),
	vec4(0.0, 1.0, 0.0, 1.0),
	vec4(0.0, 0.0, 1.0, 1.0),
	vec4(1.0, 0.0, 1.0, 1.0),
	vec4(1.0, 1.0, 1.0, 1.0),
	vec4(0.0, 1.0, 1.0, 1.0)
];

if (vertices.length != vertex_colors.length)
{
	alert("vertices and vertex_colors are of differing lengths.");
}

//Define the indices of each triangle
indices = [
	1, 0, 3,
	3, 2, 1,
	2, 3, 7,
	7, 6, 2,
	3, 0, 4,
	4, 7, 3,
	6, 5, 1,
	1, 2, 6,
	4, 5, 6,
	6, 7, 4,
	5, 4, 0,
	0, 1, 5
];

//Send verticies
send_and_bind(vertices, "vPosition");

//Send vertex colors
send_and_bind(vertex_colors, "vColor");

//Send index data to GPU
var iBuffer = gl.createBuffer();
gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, iBuffer);
gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint8Array(indices), gl.STATIC_DRAW);

if (!navigator.getVRDisplays) {
	alert("Your browser does not support WebVR.");
}

//Get the displays attached to the computer
var button = document.getElementById("vr-toggle");
navigator.getVRDisplays().then(function(displays) {
		if (displays.length > 0) {
			vrDisplay = displays[0];
			console.log("Display found.");

			button.onclick = toggle_vr_display;
		} else {
			alert("VR display not found.");
		}
	}
);