1. show point world coordinates
1. use left mouse down to revert bbox shape adjustment
1. preset bus/car dimension
1. remove bbox in bbox list when deleted.
2. ~~reverse the direction~~
3. ~~unselect when add new box~~
4. ~~edit on side view~~
5. add orthognal camera
6. ~~fix camera when selecting box by 1/2~~
7. ~~detach transform control before changing world~~.
8. ~~lock one box~~
9. ~~when pcd file doesnot exist~~
10. ~~when pcd file format not recognizable~~
11. ~~title text~~
12. ~~title icon~~
13.  open new frame when playing
14.  handle when loading pcd failed.
15.  gui, add onchange function
16.  read/write json files directly, don't rely on cherrypy to forward.
17.  ~~auto lock object~~
18.  combine all shots of an object in multiple frames, try annotate them in one view.
19.  load data hierachically
20.  ~~allocate global tracking id, automatically~~
21.  try more renderers.
22.  let main canvas fit the dimension of image.
23.  show left/right camera images.
24.  what if the active image changes while an image is preloaded?, we could clear buffer.
25.  save prompt if nav to another frame/scene
26.  some objects are soft-body, the shape may change over time.
27.  redraw 2d-image after delete a box
28.  use 3 rotation algles to select points of a box, rather than only z-axis angle.
29.  alg to do intersection of box and points
30.  let image follow selected box.
31.  for hiding floating labels, just hide the uis, don't stop adding them into the html.
32.  reset: reset rotation angle of x/y/z
33.  cancel highlight: restore color of points changed in highlight mode
34.  prevent highlighting multi-times
35.  crop points in front-end in smart-paste/auto-adjust function
36.  auto-shrink box if direction is given.
37.  box position is not updating when being adjusted
38.  views.viewport could be updated less frequently.
39.  make cameras configurable
40.  try reduce points searching times, at one adjustments, there are 6 point searching invoke.
41.  add global parameter 'sticky mode'
42.  project points to image
43.  remove image when new frame is loading
44.  improve performance of coloring object points.
45.  find box points and extreme dimension shall be seperated
46.  change box may cause camera switching.
47.  initial z positin shall be configurable, or when a new box is created, the z position/scale shall be computed. 
48.  height shall be infinity at init.
49.  0324,458, 27,48,-2. box dimension incorrect.
50.  ~~zoom in/out in sub-sideview.~~
51.  keep pointer type when draging in subviews.
52.  reset button, reset dimension not rotation. obj_cfg shall be the default size of object.
53.  hide context photo if image not available.
54.  should enlarge prototype dimension when creating new box.
55.  ~~add grid on screen, help rotating mainview.~~
56.  ~~boundary-aware rotation support on mainview.~~
57.  try auto-adjust x,y rotation by minimizing projection area.
58.  use sideview to decide object lower border.
59.  'escape' when drawing a rectangle
60.  use one-shot video object segmentation to assist image segmentation annotating
61.  keydown on object labels, should be forwarded to main-container.
62.  objs of scene shoulb be loaded only once when preloading all frames of scene.
63.  focused image context: make its aspect ratio  to 1:1
64.  show trajectory of one object
65.  reload objects w/o tracking id.
66.  linear interpolation: auto adjust is also helpful
67.  save modified anns only, in batch mode
68.  enable adding a tag to each label. issue #
69.  ctrl+move to automatically resize/rotate, shift+move to automatically rotate (only)
70.  the transformation subnetwork in pointnet for our rotation prediction is possibly unnecessary because we don't want a rotation-invariant model.
71.  add contextmenu for projective sub-views, so that we can use them in batch-mode
72.  crop point clouds, so to remove points of trees reaching out above the roads
73.  http://eprints.utar.edu.my/4212/1/1604655_FYP_Report_-_SHI_HAO_TAN.pdf