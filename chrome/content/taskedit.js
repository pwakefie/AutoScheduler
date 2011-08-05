var autoscheduler = {
    onLoad: function() {
        
        // Should use a setTimeout to delay before initializing if this runs globally in the future
        this.dbInit();
        this.populateTaskList();
        //alert("Initialization complete.");
    },
    
    dbConn: null,

    dbSchema: {
        tables: {
            tasks: "id           INTEGER PRIMARY KEY, \
                    description TEXT, \
                    notes       TEXT, \
                    start       DATETIME, \
                    end         DATETIME, \
                    estimate    INTEGER, \
                    units       TEXT",
            trees: "child       INTEGER PRIMARY KEY, \
                    parent      INTEGER",
	    chunks: "chunk_id	INTEGER PRIMARY KEY, \
		    task_id	INTEGER, \
		    start	INTEGER, \
		    end		INTEGER, \
		    duration	INTEGER, \
		    name	TEXT, \
		    bonus	INTEGER"
       }
    },
    
    task_object: function(taskID, start, end, estimate,name,bonus){
	this.id = taskID;
	this.start = start;
	this.end = end;
	this.estimate = estimate;
	this.bonus = bonus;
	this.scheduled = false;
	this.name = name;
    },
    scheduled_space: function(id,start,end,name){
	this.id = id;
	this.start = start;
	this.end = end;
	this.space = end-start;
	this.name = name;
    },

    dbInit: function() {
        var dbFile = Components.classes["@mozilla.org/file/directory_service;1"]
                        .getService(Components.interfaces.nsIProperties)
                        .get("ProfD", Components.interfaces.nsIFile);

        dbFile.append("autoscheduler.sqlite");

        var dbService = Components.classes["@mozilla.org/storage/service;1"]
                            .getService(Components.interfaces.mozIStorageService);

        var dbConn;

        if (!dbFile.exists()) {
            dbConn = dbService.openDatabase(dbFile); // Creates on access
            for(var name in this.dbSchema.tables)
                dbConn.createTable(name, this.dbSchema.tables[name]);
        } else {
            dbConn = dbService.openDatabase(dbFile);
        } this.dbConn = dbConn;
    },
    
    load_chunks: function(){
	var actarray = new Array();
	let statement = autoscheduler.dbConn.createStatement("SELECT strftime('%s', start) AS startseconds, strftime('%s', end) AS endseconds, \
                                                             * FROM tasks");
	/*
        let params = statement.newBindingParamsArray();

	for(let i = 1; i < 11;i++){
	    let bp = params.newBindingParams();
	    bp.bindByName("id", i);//<---
	    params.addParams(bp);
	}
	
        statement.bindParameters(params);
        // Query, do callback on results
	*/
	
        statement.executeAsync({
                                    handleResult: function(aResultSet) {
					for (let row = aResultSet.getNextRow();row;row = aResultSet.getNextRow()){
					    let obj = new autoscheduler.task_object(row.getResultByName("id"),
										row.getResultByName("startseconds")*1,
										row.getResultByName("endseconds")*1,
										row.getResultByName("estimate")*3600,
										row.getResultByName("description"));
					    actarray.push(obj);
					}
					
                                    },
                                    
                                    handleError: function(aError) {
                                        alert("Error loading: " + aError.message);
                                    },
            
                                    handleCompletion: function(aReason) {
                                        if (aReason != Components.interfaces.mozIStorageStatementCallback.REASON_FINISHED)
                                            alert("Load query failed!");
					autoscheduler.create_schedule(actarray);
                                    }
                                });
    },
    create_schedule: function(actarray){
	
	//15m = 900s
	var temp_array = new Array();
	while(actarray.length>0){
	    current = actarray.pop();
	    var size = current.estimate;
	    while(size > 900){
		var temp = new autoscheduler.task_object(current.id,current.start,current.end, 900,current.name,current.end-current.start-current.estimate);
		temp_array.push(temp);
		size= size-900;
	    }
	    var temp = new autoscheduler.task_object(current.id,current.start,current.end,size,current.name,current.end-current.start-current.estimate);
	    temp_array.push(temp);
	}
	autoscheduler.save_schedule(temp_array);
    },
    save_schedule: function(chunks){
	// Clear first?
	let clearStatement = autoscheduler.dbConn.createStatement("DELETE FROM chunks");
	clearStatement.executeAsync();
	
	//================================
	//+ Jonas Raoni Soares Silva
	//@ http://jsfromhell.com/array/shuffle [v1.0]

	shuffle = function(o){ //v1.0
	    for(var j, x, i = o.length; i; j = parseInt(Math.random() * i), x = o[--i], o[i] = o[j], o[j] = x);
	    return o;
	};
	shuffle(chunks);

	
	//================================
	
	//Clear
	for(let i =0; i < chunks.length;i++){
	    let statement = autoscheduler.dbConn.createStatement("INSERT INTO chunks (task_id,start,end,duration,name,bonus) \
							 VALUES (:task_id, :start, :end, :duration, :name, :bonus)");
        let params = statement.newBindingParamsArray();
        let bp = params.newBindingParams();
        
	
	bp.bindByName("task_id",chunks[i].id);
	bp.bindByName("start", chunks[i].start);
	bp.bindByName("end", chunks[i].end);
	bp.bindByName("duration", chunks[i].estimate);
	bp.bindByName("name",chunks[i].name);
	bp.bindByName("bonus",chunks[i].bonus);
        params.addParams(bp);
        statement.bindParameters(params);
        statement.executeAsync({
                                    // No results -> No handleResult()
                                    handleResult: function(aResult) {
                                        alert("Warning: SCHEDULE SAVE Results? HOW???");
                                    },
                                    
                                    handleError: function(aError) {
                                            alert("Error saving schedule: " + aError.message);
                                    },
                        
                                    handleCompletion: function(aReason) {
                                            if (aReason != Components.interfaces.mozIStorageStatementCallback.REASON_FINISHED)
                                                    alert("Saving schedule did not succeed!");
						    
					//Update UI
                                    }
                                });
	    
	    }
    },
    
    deletes: function() {
        
        let id = document.getElementById("id").value;
        autoscheduler.deleteTask(id);
    },
    
    deleteTask: function(id) {
        
        let statement = autoscheduler.dbConn.createStatement("DELETE FROM tasks WHERE id = :id");
        let params = statement.newBindingParamsArray();
        
        let bp = params.newBindingParams();
        bp.bindByName("id", id);
    
        params.addParams(bp);
        statement.bindParameters(params);
        
        // Query, do callback on results
        statement.executeAsync({
                                    handleResult: function(aResult) {
                                        alert("Warning: DELETE Results? HOW???");
                                    },
                                    
                                    handleError: function(aError) {
                                        alert("Error deleting: " + aError.message);
                                    },
            
                                    handleCompletion: function(aReason) {
                                        if (aReason != Components.interfaces.mozIStorageStatementCallback.REASON_FINISHED)
                                            alert("Load query failed!");
                                        
                                        // Update UI after deleting
                                        autoscheduler.populateTaskList();
                                        autoscheduler.clearFields();
					autoscheduler.load_chunks();
                                    }
                                });
        
        
    },
    
    sortTasksByStart: function(a,b){
	if(a.start > b.start)
	    return 1;
	if(a.start < b.start)
	    return -1;
	return 0;
    },
    sortTasksByBonus: function(a,b){
	if(a.bonus > b.bonus)
	    return -1;
	if(a.bonus < b.bonus)
	    return 1;
	return 0;
    },
    
    pre_schedule: function(){
	var actarray = new Array();
	let statement = autoscheduler.dbConn.createStatement("SELECT strftime('%s', start) AS startseconds, strftime('%s', end) AS endseconds, \
                                                             * FROM chunks");

        //statement.bindParameters(params);
        // Query, do callback on results
        statement.executeAsync({
                                    handleResult: function(aResultSet) {
					for (let row = aResultSet.getNextRow();row;row = aResultSet.getNextRow()){
					    let obj = new autoscheduler.task_object(row.getResultByName("chunk_id"),
										row.getResultByName("start")*1,
										row.getResultByName("end")*1,
										row.getResultByName("duration"),
										row.getResultByName("name"));
					    actarray.push(obj);
					}
                                    },
                                    
                                    handleError: function(aError) {
                                        alert("Error loading: " + aError.message);
                                    },
            
                                    handleCompletion: function(aReason) {
                                        if (aReason != Components.interfaces.mozIStorageStatementCallback.REASON_FINISHED)
                                            alert("Load query failed!");
					autoscheduler.schedule_algorithm(actarray);
				    }
                                });
	
    },
    
    schedule_algorithm: function(actarray){
	actarray.sort(autoscheduler.sortTasksByBonus);
	//new Date().getTime()
	var blank = new autoscheduler.scheduled_space(0,Math.floor(new Date().getTime()/1000)-86400,Math.floor(new Date().getTime()/1000)+604800);
	var space_array = new Array(blank);

	
	actarray.sort(autoscheduler.sortTasksByBonus);
	while(actarray.length > 0){
	    var current = actarray.pop();
	    for(let i = 0; i < space_array.length; i++){
		var a = current.start + current.estimate;
		if((space_array[i].id == 0 && space_array[i].start <= current.start && space_array[i].end >=current.start+current.estimate)){//Current can be scheduled into this spot
		    //Schedule current into space_array by creating 1-3 new scheduled_space objects, removing element 'i', and pushing those spaces back into the array.
		    //Spaces are: Current task to be scheduled, pre-task time, post-task time (if necessary)
		    //Set current.scheduled to true;
		    if(space_array[i].start == current.start && space_array[i].end != current.start+current.estimate){
		    //Space after only
			var b = new autoscheduler.scheduled_space(0,current.start+current.estimate,space_array[i].end,"FREE");//after object
			var c = new autoscheduler.scheduled_space(current.id,current.start,current.start+current.estimate,current.name);//task object
			space_array.splice(i,1);
			space_array.push(b,c);
			current.scheduled = true;
			break;
		    }
		    if(space_array[i].start != current.start && space_array[i].end ==current.start+current.estimate){
		    //Space before only
			var a = new autoscheduler.scheduled_space(0,space_array[i].start,current.start,"FREE");//before object
			var c = new autoscheduler.scheduled_space(current.id,current.start,current.start+current.estimate,current.name);//task object
			space_array.splice(i,1);
			space_array.push(a,c);
			current.scheduled = true;
			break;
		    }
		    if(space_array[i].start == current.start && space_array[i].end ==current.start+current.estimate){
		    //Fits perfectly
			var c = new autoscheduler.scheduled_space(current.id,current.start,current.start+current.estimate,current.name);//task object
			space_array.splice(i,1);
			space_array.push(c);
			current.scheduled = true;
			break;
		    }
		    if(space_array[i].start != current.start && space_array[i].end !=current.start+current.estimate){
		    //Space before and after
			var a = new autoscheduler.scheduled_space(0,space_array[i].start,current.start,"FREE");//before object
			var b = new autoscheduler.scheduled_space(0,current.start+current.estimate,space_array[i].end,"FREE");//after object
			var c = new autoscheduler.scheduled_space(current.id,current.start,current.start+current.estimate,current.name);//task object
			space_array.splice(i,1);
			space_array.push(a,b,c);
			current.scheduled = true;
			break;
		    }
		}//CURRENT PROBLEM LIES HERE 
		else if(space_array[i].id == 0 && space_array[i].start >= current.start && space_array[i].end <= current.end && space_array[i].space >= current.estimate){
			var c = new autoscheduler.scheduled_space(current.id,space_array[i].start,space_array[i].start+current.estimate,current.name);
			var b = new autoscheduler.scheduled_space(0,space_array[i].start+current.estimate,space_array[i].end,"FREE");
			space_array.splice(i,1);
			space_array.push(c);
			if(b.space > 0){
			    space_array.push(b);
			}
			current.scheduled = true;
			break;
		}
		//Task slightly before
		else if(space_array[i].id == 0 && space_array[i].start >= current.start && space_array[i].end >= current.end && current.end-space_array[i].start > current.estimate){
		    var c = new autoscheduler.scheduled_space(current.id, space_array[i].start,space_array[i].start+current.estimate,current.name);
		    var b = new autoscheduler.scheduled_space(0,space_array[i].start+current.estimate,space_array[i].end,"FREE");
		    space_array.splice(i,1);
		    space_array.push(b,c);
		    current.scheduled = true;
		    break;
		    
		}
		//Task slightly after
		else if(space_array[i].id == 0 && space_array[i].start <= current.start && space_array[i].end <= current.end && space_array[i].end-current.start > current.estimate){
		    var c = new autoscheduler.scheduled_space(current.id,current.start,current.start+current.estimate,current.name);
		    var a = new autoscheduler.scheduled_space(0,current.start+current.estimate,space_array[i].end,"FREE");
		    var b = new autoscheduler.scheduled_space(0,space_array[i].start,current.start,"FREE");
		    space_array.splice(i,1);
		    space_array.push(a,b,c);
		    current.scheduled = true;
		    break;
		}
	    }
	    if(!current.scheduled){
		alert("Could not complete scheduling");
		//document.getElementById("schedule_notes").value = space_array[0].start +"\t"+space_array[0].end+"\n"+current.start+"\t"+current.end;
		break;
	    }

	}
	autoscheduler.print_schedule(space_array);
	
    },
    
    print_schedule: function(space_array){
	function createTreeItem(type) {
	    const XUL_NS = "http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul";
	    var item = document.createElementNS(XUL_NS, type); // create a new XUL menuitem
	    //item.setAttribute("id", anId);
	    return item;
	}
	var element = document.getElementById("schlist");
	//Sort by start times
	space_array.sort(autoscheduler.sortTasksByStart);
	//Print contents of schedule into the schlist box
	while(element.hasChildNodes()){
	    element.removeChild(element.firstChild);
	}
	for(let i = 0; i < space_array.length;i++){
	    var tree_item = createTreeItem("treeitem");
	    tree_item.setAttribute("id",space_array[i].name+i+"_treeitem");
	    element.appendChild(tree_item);
	    var tree_row = createTreeItem("treerow");
	    tree_row.setAttribute("id",space_array[i].name+i+"_treerow");
	    document.getElementById(space_array[i].name+i+"_treeitem").appendChild(tree_row);
	    var tree_name = createTreeItem("treecell");
	    tree_name.setAttribute("label",space_array[i].name);
	    var tree_start = createTreeItem("treecell");
	    var now = new Date();
	    if(now.toLocaleDateString()!=(new Date(space_array[i].start*1000)).toLocaleDateString()){//Different day
		
		//alert((new Date(space_array[i].start*1000)).toLocaleDateString());
		tree_start.setAttribute("label",((new Date(space_array[i].start*1000)).getMonth()+1)+"/"+((new Date(space_array[i].start*1000)).getDate())+" "+(new Date(space_array[i].start*1000)).toLocaleTimeString());
	    }
	    else{
		tree_start.setAttribute("label",(new Date(space_array[i].start*1000)).toLocaleTimeString());
	    }
	    var tree_end = createTreeItem("treecell");
	    if(now.toLocaleDateString()!=(new Date(space_array[i].end*1000)).toLocaleDateString()){//Different day
		tree_end.setAttribute("label",((new Date(space_array[i].end*1000)).getMonth()+1)+"/"+((new Date(space_array[i].end*1000)).getDate())+" "+(new Date(space_array[i].end*1000)).toLocaleTimeString());
	    }
	    else{
		tree_end.setAttribute("label",(new Date(space_array[i].end*1000)).toLocaleTimeString());
	    }
	    document.getElementById(space_array[i].name+i+"_treerow").appendChild(tree_name);
	    document.getElementById(space_array[i].name+i+"_treerow").appendChild(tree_start);
	    document.getElementById(space_array[i].name+i+"_treerow").appendChild(tree_end);
	}
    },

    props: ["description", "notes", "start", "end", "estimate", "units"],
    
    Task: function(id, description, notes, start, end, estimate, units) {
        this.id = id;
        this.description = description;
        this.notes = notes;
        this.start = start;
        this.end = end;
        this.estimate = estimate;
        this.units = units;	
    },

    load: function() {
        
        // Idea: Disable fields until loaded as a precaution
        
        
        let id = document.getElementById("id").value;
        autoscheduler.loadTask(id);
    },

    save: function(){
        let task = new autoscheduler.Task(document.getElementById("id").value,
                            document.getElementById("description").value,
                            document.getElementById("notes").value,
                            new Date(document.getElementById("startdate").year,
                                    document.getElementById("startdate").month,
                                    document.getElementById("startdate").date,
                                    document.getElementById("starttime").hour,
                                    document.getElementById("starttime").minute,
                                    document.getElementById("starttime").second),
                            new Date(document.getElementById("enddate").year,
                                    document.getElementById("enddate").month,
                                    document.getElementById("enddate").date,
                                    document.getElementById("endtime").hour,
                                    document.getElementById("endtime").minute,
                                    document.getElementById("endtime").second),
                            document.getElementById("estimate").value,
                            document.getElementById("units").selectedItem.getAttribute("label"));
        autoscheduler.saveTask(task);
    },
    
    loadTask: function(id) {
        
        let statement = autoscheduler.dbConn.createStatement("SELECT strftime('%s', start) AS startseconds, strftime('%s', end) AS endseconds, \
                                                             * FROM tasks WHERE id = :id");
        let params = statement.newBindingParamsArray();
        
        let bp = params.newBindingParams();
        bp.bindByName("id", id);
    
        params.addParams(bp);
        statement.bindParameters(params);
        
        // Query, do callback on results
        statement.executeAsync({
                                    handleResult: function(aResult) {

                                        //alert("Successful load.");
                                        let r = aResult.getNextRow();
                                        let task = new autoscheduler.Task(r.getResultByName("id"),
                                                            r.getResultByName("description"),
                                                            r.getResultByName("notes"),
                                                            new Date(r.getResultByName("startseconds") * 1000),
                                                            new Date(r.getResultByName("endseconds") * 1000),
                                                            r.getResultByName("estimate"),
                                                            r.getResultByName("units").toString()
                                                            );
                                        autoscheduler.doLoadTask(task);
                                    },
                                    
                                    handleError: function(aError) {
                                        alert("Error loading: " + aError.message);
                                    },
            
                                    handleCompletion: function(aReason) {
                                        if (aReason != Components.interfaces.mozIStorageStatementCallback.REASON_FINISHED)
                                            alert("Load query failed!");
                                    }
                                });   
    },

    doLoadTask: function(task) {
        //alert("Populating fields");
        document.getElementById("id").value = task.id;
        document.getElementById("description").value = task.description;
        document.getElementById("notes").value = task.notes;
        document.getElementById("startdate").dateValue = task.start;
        document.getElementById("starttime").dateValue = task.start;
        document.getElementById("enddate").dateValue = task.end;
        document.getElementById("endtime").dateValue = task.end;
        document.getElementById("estimate").value = task.estimate;
        document.getElementById("units").selectedItem = document.getElementById("units-"+task.units);
    },

    // Determine Insert or Update for saving a task
    saveTask: function(task) {
        
        // If invalid id, skip query and create new
        if(task.id < 0) {
            autoscheduler.doSaveTask(task, false);
            return;
        }
        
        let statement = autoscheduler.dbConn.createStatement("SELECT COUNT(*) AS Count FROM tasks WHERE id = :id");
        let params = statement.newBindingParamsArray();
        
        let bp = params.newBindingParams();
        bp.bindByName("id", task.id);
    
        params.addParams(bp);
        statement.bindParameters(params);
        
        // Query, do callback on results
        statement.executeAsync({
                                    handleResult: function(aResult) {
                                        let r = aResult.getNextRow();
                                        if(r.getResultByName("Count")) {
                                            //alert("Did exist.");
                                            autoscheduler.doSaveTask(task, true);
                                        } else {
                                            //alert("Did not exist.");
                                            autoscheduler.doSaveTask(task, false);
                                        }
                                    },
                                    
                                    handleError: function(aError) {
                                        alert("Error checking existence: " + aError.message);
                                    },
            
                                    handleCompletion: function(aReason) {
                                        if (aReason != Components.interfaces.mozIStorageStatementCallback.REASON_FINISHED)
                                            alert("Existence check failed!");
                                    }
                                });
        //alert("Executing existence query");
    },
            
        
    doSaveTask: function(task, exists) {
        
        // Warning: Clunky hack modifies the passed task object
        
        // Convert Date objects for binding
        task.start = task.start.getTime()/1000;
        task.end = task.end.getTime()/1000;
        
        let statement = null;
        
        // Choose Insert or Update
        if(!exists) {
            statement = autoscheduler.dbConn.createStatement("INSERT INTO tasks (description, notes, start, end, estimate, units) \
                                                VALUES (:description, :notes, datetime(:start, 'unixepoch'), datetime(:end, 'unixepoch'), :estimate, :units)");
        } else {
            statement = autoscheduler.dbConn.createStatement("UPDATE tasks SET description=:description, notes=:notes, start=datetime(:start, 'unixepoch'), \
                                                end=datetime(:end, 'unixepoch'), estimate=:estimate, units=:units WHERE id = :id");
        }
        
        let params = statement.newBindingParamsArray();
        let bp = params.newBindingParams();
        
        // Bind parameters
            // ID only if updating
        if(exists) {
            bp.bindByName("id", task.id);
        }
            // Everything else
        for (let x=0; x<autoscheduler.props.length; x++) {
            bp.bindByName(autoscheduler.props[x], task[autoscheduler.props[x]]);
        }
        
        params.addParams(bp);
        statement.bindParameters(params);
        
        statement.executeAsync({
                                    // No results -> No handleResult()
                                    handleResult: function(aResult) {
                                        alert("Warning: SAVE Results? HOW???");
                                    },
                                    
                                    handleError: function(aError) {
                                            alert("Error saving: " + aError.message);
                                    },
                        
                                    handleCompletion: function(aReason) {
                                            if (aReason != Components.interfaces.mozIStorageStatementCallback.REASON_FINISHED)
                                                    alert("Saving did not succeed!");
                                            autoscheduler.populateTaskList();
					    autoscheduler.load_chunks();
                                    }
                                });
        //alert("Statement Executing");
    },
    
    clearFields: function(){
	document.getElementById("id").value = 0;
	document.getElementById("description").value = "";
	document.getElementById("notes").value = "";
	document.getElementById("estimate").value = "";
    },
    
    populateTaskList: function() {
	function createListItem(aLabel) {
	    const XUL_NS = "http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul";
	    var item = document.createElementNS(XUL_NS, "listitem"); // create a new XUL menuitem
	    item.setAttribute("label", aLabel);
	    return item;
	}
	var element = document.getElementById("actlist");// a <menupopup> element

	while(element.hasChildNodes()){
	    element.removeChild(element.firstChild);
	}

        let statement = autoscheduler.dbConn.createStatement("SELECT * FROM tasks");
	var createnew = createListItem("--NEW ACTIVITY--");
	createnew.setAttribute("value","0");
	element.appendChild(createnew);
        
        element.selectedIndex = 0;
	
        
        // Query, do callback on results
        statement.executeAsync({
                                    handleResult: function(taskList) {
                                        // Populate the Task list
                                        for(let r = taskList.getNextRow(); r != null; r = taskList.getNextRow()) {
                                            
                                            
					    var newlabel = createListItem(r.getResultByName("description"));
					    newlabel.setAttribute("value",r.getResultByName("id"));
					    element.appendChild(newlabel);
                                            
                                            
                                        }
                                    },
                                    
                                    handleError: function(aError) {
                                        alert("Error populating Task List: " + aError.message);
                                    },
            
                                    handleCompletion: function(aReason) {
                                        if (aReason != Components.interfaces.mozIStorageStatementCallback.REASON_FINISHED)
                                            alert("Populating Task List failed!");
                                    }
                                });
        //alert("Executing Task List query");
    }
}

window.addEventListener("load", function () { autoscheduler.onLoad(); }, false);
