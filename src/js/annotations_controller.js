function AnnotationsController(canvas_id, default_config) {
    this.canvas_id = canvas_id;
    this.x_offset = undefined;
    this.y_offset = undefined;
    this.canvas = undefined;
    this.shapes_cache = {};
    this.paper_scope = new paper.PaperScope();
    // geometries appearance default configuration
    if (typeof default_config === 'undefined') {
        // to prevent errors in the following lines
        console.log('No configuration provided, using default values for shapes config');
        default_config = {};
    }
    this.default_fill_color = (typeof default_config.fill_color === 'undefined') ? '#ffffff' : default_config.fill_color;
    this.default_fill_alpha = (typeof default_config.fill_alpha === 'undefined') ? 1 : default_config.fill_alpha;
    this.default_stroke_color = (typeof default_config.stroke_color === 'undefined') ? '#000000' : default_config.stroke_color;
    this.default_stroke_alpha = (typeof default_config.stroke_alpha === 'undefined') ? 1 : default_config.stroke_alpha;
    this.default_stroke_width = (typeof default_config.stroke_width === 'undefined') ? 20 : default_config.stroke_width;

    this.buildAnnotationsCanvas = function (viewport_controller) {
        if (this.canvas === undefined) {
            this.x_offset = viewport_controller.getImageDimensions().width / 2;
            this.y_offset = viewport_controller.getImageDimensions().height / 2;
            this.image_mpp = viewport_controller.getImageMicronsPerPixel();

            var canvas = $("#" + this.canvas_id);
            if (canvas.length === 0) {
                console.log('Creating a new canvas');
                // create a canvas that will be used by paper.js
                $("body").append("<canvas id='" + this.canvas_id + "'></canvas>");
                this.canvas = canvas[0];
            } else {
                console.log('Using an existing canvas');
                this.canvas = canvas[0];
            }
            var canvas_size = viewport_controller.getCanvasSize();
            $(this.canvas).width(canvas_size.width)
                .height(canvas_size.height);

            this.paper_scope.setup(this.canvas);
            // clean the canvas
            this.clear();
        } else {
            console.warn("Canvas already initialized");
        }
    };
    
    this._activate_paper_scope = function() {
        this.paper_scope.activate();
    };

    this.enableMouseEvents = function() {
        this._activate_paper_scope();
        $("#" + this.canvas_id).css('pointer-events', 'auto');
    };

    this.disableMouseEvents = function() {
        $("#" + this.canvas_id).css('pointer-events', 'none');
    };

    var refresh = function(global_obj, auto_refresh) {
        var r = (typeof auto_refresh === 'undefined') ? true : auto_refresh;
        if (r) {
            global_obj.refreshView();
        }
    };

    this.refreshView = function() {
        this._activate_paper_scope();
        paper.view.draw();
    };

    this.getZoom = function() {
        return this.paper_scope.getView().zoom;
    };

    this.setZoom = function(zoom_level) {
        this._activate_paper_scope();
        paper.view.setZoom(zoom_level);
    };

    this.setCenter = function(center_x, center_y) {
        this._activate_paper_scope();
        var center = new paper.Point(
            center_x - this.x_offset,
            center_y - this.y_offset
        );
        paper.view.setCenter(center);
    };

    this._getShapeId = function(id_prefix) {
        var id_counter = 1;
        var shape_id = id_prefix + '_' + id_counter;
        while (shape_id in this.shapes_cache) {
            id_counter += 1;
            shape_id = id_prefix + '_' + id_counter;
        }
        return shape_id;
    };

    this.addShapeToCache = function(shape) {
        if (! (shape.id in this.shapes_cache)) {
            this.shapes_cache[shape.id] = shape;
            return true;
        } else {
            console.error('ID ' + shape.id + ' already in use');
            return false;
        }
    };

    this.getShape = function(shape_id) {
        if (shape_id in this.shapes_cache) {
            return this.shapes_cache[shape_id];
        } else {
            return undefined;
        }
    };

    this.getShapes = function(shapes_id) {
        var shapes = [];
        if (typeof shapes_id !== 'undefined') {
            for (var index in shapes_id) {
                if (shapes_id[index] in this.shapes_cache) {
                    shapes.push(this.shapes_cache[shapes_id[index]]);
                } else {
                    console.warn('There is no shape with ID ' + shapes_id[index]);
                }
            }
        } else {
            for (var sh in this.shapes_cache) {
                shapes.push(this.shapes_cache[sh]);
            }
        }
        return shapes;
    };

    this.getShapeJSON = function(shape_id) {
        if (shape_id in this.shapes_cache) {
            return this.shapes_cache[shape_id].toJSON(this.x_offset, this.y_offset);
        } else {
            return undefined;
        }
    };

    this.getShapesJSON = function(shapes_id) {
        var shapes_json = [];
        if (typeof shapes_id !== 'undefined') {
            for (var index in shapes_id) {
                if (shapes_id[index] in this.shapes_cache) {
                    shapes_json.push(this.getShapeJSON(shapes_id[index]));
                } else {
                    console.warn('There is no shape with ID ' + shapes_id[index]);
                }
            }
        } else {
            for (var sh in this.shapes_cache) {
                shapes_json.push(this.getShapeJSON(sh));
            }
        }
        return shapes_json;
    };

    this.getShapeDimensions = function(shape_id, decimal_digits) {
        if (shape_id in this.shapes_cache) {
            return {
                'area': this.shapes_cache[shape_id].getArea(this.image_mpp, decimal_digits),
                'perimeter': this.shapes_cache[shape_id].getPerimeter(this.image_mpp, decimal_digits)
            }
        } else {
            return undefined;
        }
    };

    this.getShapesDimensions = function(shapes_id, decimal_digits) {
        var dimensions = {};
        if (typeof shapes_id !== 'undefined') {
            for (var index in shapes_id) {
                if (shapes_id[index] in this.shapes_cache) {
                    dimensions[shapes_id[index]] = this.getShapeDimensions(shapes_id[index], decimal_digits);
                } else {
                    console.warn('There is no shape with ID ' + shapes_id[index]);
                }
            }
        } else {
            for (var sh in this.shapes_cache) {
                dimensions[sh] = this.getShapeDimensions(sh);
            }
        }
        return dimensions;
    };

    this.getShapeCenter = function(shape_id, apply_offset) {
        var add_offset = (typeof apply_offset === 'undefined') ? true : apply_offset;
        var shape = this.getShape(shape_id);
        if (shape !== 'undefined') {
            var x_offset = (add_offset === true) ? this.x_offset : 0;
            var y_offset = (add_offset === true) ? this.y_offset : 0;
            var shape_center = shape.getCenter();
            return {
                'x': shape_center.x + x_offset,
                'y': shape_center.y + y_offset
            }
        } else {
            return undefined;
        }
    };

    this.selectShape = function(shape_id, clear_selected, refresh_view) {
        this._activate_paper_scope();
        var clear = (typeof clear_selected === 'undefined') ? false : clear_selected;
        if (clear === true) {
            this.deselectShapes();
        }
        if (shape_id in this.shapes_cache) {
            this.shapes_cache[shape_id].select();
        }
        refresh(this, refresh_view);
    };

    this.selectShapes = function(shapes_id, clear_selected, refresh_view) {
        this._activate_paper_scope();
        var clear = (typeof clear_selected === 'undefined') ? false : clear_selected;
        if (clear === true) {
            for (var index in this.shapes_cache) {
                this.deselectShape(shapes_id[index]);
            }
        }
        if (typeof shapes_id !== 'undefined') {
            for (var sh in shapes_id) {
                this.selectShape(sh, false, false);
            }
        } else {
            for (var sh in this.shapes_cache) {
                this.selectShape(sh, false, false);
            }
        }
        refresh(this, refresh_view);
    };

    this.enableEventsOnShapes = function(shapes_id, events) {
        if (typeof shapes_id !== 'undefined') {
            for (var index in shapes_id) {
                if (shapes_id[index] in this.shapes_cache) {
                    this.shapes_cache[shapes_id[index]].enableEvents(events);
                } else {
                    console.warn('There is no shape with ID ' + shapes_id[index]);
                }
            }
        } else {
            for (var sh in this.shapes_cache) {
                this.shapes_cache[sh].enableEvents(events);
            }
        }
    };

    this.disableEventsOnShapes = function(shapes_id, events) {
        if (typeof shapes_id !== 'undefined') {
            for (var index in shapes_id) {
                if (shapes_id[index] in this.shapes_cache) {
                    this.shapes_cache[shapes_id[index]].disableEvents(events);
                } else {
                    console.warn('There is no shape with ID ' + shapes_id[index]);
                }
            }
        } else {
            for (var sh in this.shapes_cache) {
                this.shapes_cache[sh].disableEvents(events);
            }
        }
    };

    this.deselectShape = function(shape_id, refresh_view) {
        this._activate_paper_scope();
        if (shape_id in this.shapes_cache) {
            this.shapes_cache[shape_id].deselect();
        }
        refresh(this, refresh_view);
    };

    this.deselectShapes = function (shapes_id, refresh_view) {
        this._activate_paper_scope();
        if (typeof shapes_id !== 'undefined') {
            for (var index in shapes_id) {
                this.deselectShape(shapes_id[index], false);
            }
        } else {
            for (var sh in this.shapes_cache) {
                this.deselectShape(sh, false);
            }
        }
        refresh(this, refresh_view);
    };

    this.showShape = function(shape_id, refresh_view) {
        this._activate_paper_scope();
        if (shape_id in this.shapes_cache) {
            this.shapes_cache[shape_id].show();
        }
        refresh(this, refresh_view);
    };

    this.showShapes = function(shapes_id, refresh_view) {
        this._activate_paper_scope();
        if (typeof shapes_id !== 'undefined') {
            for (var index in shapes_id) {
                this.showShape(shapes_id[index], false);
            }
        } else {
            for (var sh in this.shapes_cache) {
                this.showShape(sh, false);
            }
        }
        refresh(this, refresh_view);
    };

    this.hideShape = function(shape_id, refresh_view) {
        this._activate_paper_scope();
        if (shape_id in this.shapes_cache) {
            this.shapes_cache[shape_id].hide();
        }
        refresh(this, refresh_view);
    };

    this.hideShapes = function (shapes_id, refresh_view) {
        this._activate_paper_scope();
        if (typeof shapes_id !== 'undefined') {
            for (var index in shapes_id) {
                this.hideShape(shapes_id[index], false);
            }
        } else {
            for (var sh in this.shapes_cache) {
                this.hideShape(sh, false);
            }
        }
        refresh(this, refresh_view);
    };

    this.deleteShape = function(shape_id, refresh_view) {
        this._activate_paper_scope();
        if (shape_id in this.shapes_cache) {
            this.shapes_cache[shape_id].delete();
            delete this.shapes_cache[shape_id];
            var deleted = true;
        } else {
            var deleted = false;
        }
        refresh(this, refresh_view);
        return deleted;
    };

    this.deleteShapes = function(shapes_id, refresh_view) {
        if (typeof shapes_id !== 'undefined') {
            this._activate_paper_scope();
            for (var index in shapes_id) {
                this.deleteShape(shapes_id[index], false);
            }
            refresh(this, refresh_view);
        } else {
            this.clear(refresh_view);
        }
    };

    this.clear = function(refresh_view) {
        this._activate_paper_scope();
        for (var shape_id in this.shapes_cache) {
            this.deleteShape(shape_id, false);
        }
        refresh(this, refresh_view);
    };

    this.normalizeShapeConfig = function(conf) {
        if (typeof conf === 'undefined') {
            conf = {};
        }
        return {
            'fill_color': (typeof conf.fill_color === 'undefined') ? this.default_fill_color : conf.fill_color,
            'fill_alpha': (typeof  conf.fill_alpha === 'undefined') ? this.default_fill_alpha : conf.fill_alpha,
            'stroke_color': (typeof conf.stroke_color === 'undefined') ? this.default_stroke_color : conf.stroke_color,
            'stroke_alpha': (typeof conf.stroke_alpha === 'undefined') ? this.default_stroke_alpha : conf.stroke_alpha,
            'stroke_width': (typeof conf.stroke_width === 'undefined') ? this.default_stroke_width : conf.stroke_width
        };
    };

    this.drawShape = function(shape, shape_conf, refresh_view) {
        this._activate_paper_scope();
        var conf = this.normalizeShapeConfig(shape_conf);
        shape.toPaperShape();
        shape.configure(conf);
        // apply offset as a translation on the shape
        shape.transformShape(
            TransformMatrixHelper.getTranslationMatrix(-this.x_offset, -this.y_offset)
        );
        refresh(this, refresh_view);
    };

    this.drawRectangle = function(shape_id, top_left_x, top_left_y, width, height, transform,
                                  shape_conf, refresh_view) {
        var rect = new Rectangle(shape_id, top_left_x, top_left_y, width, height, transform);
        if (this.addShapeToCache(rect)) {
            this.drawShape(rect, shape_conf, refresh_view);
        }
    };

    this.drawEllipse = function(shape_id, center_x, center_y, radius_x, radius_y, transform,
                                shape_conf, refresh_view) {
        var ellipse = new Ellipse(shape_id, center_x, center_y, radius_x, radius_y, transform);
        if (this.addShapeToCache(ellipse)) {
            this.drawShape(ellipse, shape_conf, refresh_view);
        }
    };

    this.drawCircle = function(shape_id, center_x, center_y, radius, transform,
                               shape_conf, refresh_view) {
        var circle = new Circle(shape_id, center_x, center_y, radius, transform);
        if (this.addShapeToCache(circle)) {
            this.drawShape(circle, shape_conf, refresh_view);
        }
    };

    // keeping for backward compatibility
    this.drawLine = function(shape_id, from_x, from_y, to_x, to_y, transform,
                             shape_conf, refresh_view) {
        var points = [
            {'point': {'x': from_x, 'y': from_y}},
            {'point': {'x': to_x, 'y': to_y}}
        ];
        this.drawPolyline(shape_id, points, transform, shape_conf, refresh_view);
    };

    this.drawPolyline = function(shape_id, segments, transform, shape_conf, refresh_view) {
        var polyline = new Polyline(shape_id, segments, transform);
        if (this.addShapeToCache(polyline)) {
            this.drawShape(polyline, shape_conf, refresh_view);
        }
    };

    this.drawPolygon = function(shape_id, segments, transform, shape_conf, refresh_view) {
        var polygon = new Polygon(shape_id, segments, transform);
        if (this.addShapeToCache(polygon)) {
            this.drawShape(polygon, shape_conf, refresh_view);
        }
    };

    this.drawShapeFromJSON = function(shape_json, refresh_view) {
        var shape_conf = {
            'fill_color': shape_json.fill_color,
            'fill_alpha': shape_json.fill_alpha,
            'stroke_color': shape_json.stroke_color,
            'stroke_alpha': shape_json.stroke_alpha,
            'stroke_width': shape_json.stroke_width
        };
        switch (shape_json.type) {
            case 'rectangle':
                this.drawRectangle(
                    shape_json.shape_id, shape_json.origin_x, shape_json.origin_y, shape_json.width, shape_json.height,
                    TransformMatrixHelper.fromMatrixJSON(shape_json.transform), shape_conf, false
                );
                break;
            case 'ellipse':
                this.drawEllipse(
                    shape_json.shape_id, shape_json.center_x, shape_json.center_y, shape_json.radius_x, shape_json.radius_y,
                    TransformMatrixHelper.fromMatrixJSON(shape_json.transform), shape_conf, false
                );
                break;
            case 'circle':
                this.drawCircle(
                    shape_json.shape_id, shape_json.center_x, shape_json.center_y, shape_json.radius,
                    TransformMatrixHelper.fromMatrixJSON(shape_json.transform), shape_conf, false
                );
                break;
            // keeping for backward compatibility
            case 'line':
                this.drawLine(
                    shape_json.shape_id, shape_json.from_x, shape_json.from_y, shape_json.to_x, shape_json.to_y,
                    TransformMatrixHelper.fromMatrixJSON(shape_json.transform), shape_conf, false
                );
                break;
            case 'polyline':
                this.drawPolyline(
                    shape_json.shape_id, shape_json.segments,
                    TransformMatrixHelper.fromMatrixJSON(shape_json.transform), shape_conf, false
                );
                break;
            case 'polygon':
                this.drawPolygon(
                    shape_json.shape_id, shape_json.segments,
                    TransformMatrixHelper.fromMatrixJSON(shape_json.transform), shape_conf, false
                );
                break;
            default:
                console.warn('Item ' + shape_json + ' is not a JSON shape representation');
        }
        refresh(this, refresh_view);
    };

    this.drawShapesFromJSON = function(shapes_json, refresh_view) {
        var ac = this;
        $.each(shapes_json, function(index, shape) {
            ac.drawShapeFromJSON(shape, false);
        });
        refresh(this, refresh_view);
    };

    this._replaceShapePath = function(shape_id, path) {
        console.log('SHAPE ID IS: ' + shape_id);
        var shape_json = this.getShapeJSON(shape_id);
        console.log(shape_json);
        shape_json.segments = path;
        this.deleteShape(shape_id);
        this.drawShapeFromJSON(shape_json);
        this.refreshView();
    };

    this.intersectShapes = function(shape1, shape2, replace_shape_1, replace_shape_2, clear_intersection) {
        if (
            shape1.intersectsShape(shape2) === true ||
            shape1.containsShape(shape2) === true ||
            shape2.containsShape(shape1) === true
        ) {
            var remove_intersection = typeof clear_intersection === 'undefined' ? true : clear_intersection;
            var intersection = shape1.getIntersection(shape2 , !(remove_intersection));
            console.log('REPLACING WITH INTERSECTION: ' + intersection);
            var intersection_path = ShapeConverter.extractPathSegments(intersection,
                this.x_offset, this.y_offset);
            if (replace_shape_1 === true) {
                this._replaceShapePath(shape1.id, intersection_path);
            } else if (replace_shape_2 === true) {
                this._replaceShapePath(shape2.id, intersection_path);
            }
        } else {
            console.warn('No intersection between the two shapes');
        }
    };

    this.mergeShapes = function(shape1, shape2, replace_shapes, clear_union) {
        var clear = typeof clear_union === 'undefined' ? true : clear_union;
        var replace = typeof replace_shapes === 'undefined' ? true : replace_shapes;
        if (shape1.containsShape(shape2) === false && shape2.containsShape(shape1) === false) {
            if (shape1.intersectsShape(shape2) === true) {
                var union = shape1.getUnion(shape2, !(clear));
                if (replace === true) {
                    console.log('REPLACING WITH UNION: ' + union);
                    var union_path = ShapeConverter.extractPathSegments(union, this.x_offset, this.y_offset);
                    this.deleteShape(shape2.id);
                    this._replaceShapePath(shape1.id, union_path);
                }
            } else {
                console.warn('Shapes can\'t be merged together');
            }
        } else if (shape1.containsShape(shape2) === true && replace === true) {
            this.deleteShape(shape2);
        } else if (shape2.containsShape(shape1) === true && replace === true) {
            this.deleteShape(shape1);
        }
    };
}
