# UI-Fingerprint Pattern Detection
This project is a prototype of utilizing the fingerprint based recognition algorithm used in the Shazam-application to recognize patterns in user interactions on a website. The idea is to capture mouse movements / eytracking signals to determine, which parts of a website are visited most, how users browse the website and in which sequence they focus on different parts of this website. Depending on these information, a well-founded rework of the website could take place, in which elements might be rearanged or redesigned to allow for the desired view guidance. Other focal points might be getting to know, which information are most needed by users or which element designs they like most. To be able to do so, the algorithm described by Wang (Papers: "An industrial strength audio search algorithm, 2003" and "The Shazam music recognition service, 2006") was adopted and adjusted to this use case. The fingerprinting part based on combinatorial hashing was considered the most useful part for this project, which is why it was build around this procedure.

The project has to be seen as a first POC that was a by-product of a paper I had to write for the course "Spezielle Gebiete der Mathematik" in the degree course "Medieninformatik Master" at TH-Köln, which involved describing the Shazam algorithm, possible improvements and other use cases (another prototype representing a simple shazam clone has been created as well, which can be found [here](https://github.com/ddubbert/Simple_Shazam_Clone)). In the following sections the prototype and its functionality will be explained, followed by implementation details, possible improvements of this prototype and an installation guide. Because the algorithm used by Shazam wont be described further, it is highly recommended to have a look at the previously mentioned papers, before using this software.

# Table of Contents
* [Functionality](#functionality)
	* [Track Movements](#track)
	* [Record Sample](#record_sample)
		* [Time Domain](#time_domain)
		* [Spectrum](#spectrum)
		* [Spectrogram](#spectrogram)
		* [Constellation Map](#constellation)
		* [Song Matching](#record_sample)
	* [Sinusoids](#sinusoids)
* [Project Setup](#project_setup)


## Functionality <a name="functionality"></a>
As mentioned before, this POC is meant to capture mouse movements of users visiting the website (e.g. while engaging in a UI-Test) to determine usage patterns of the website. Even though only mouse movements are tracked, the principle was firstly thought of in combination with an eyetracking system and can be fully applied to such a system. At the moment, the prototype is implemented as an overlay providing different functionality-buttons and inputs. 
![overview](./imagesDocumentation/pageOverview.png?raw=true "Overview")
It is build on top of the Vue framework, which is why the webpage itself is just a simple starter page (whith hyperlinks being replaced by colored text, to disable interactions that make you accidentally leave the page). The most important parts for the first interaction are the buttons on top.
![buttons](./imagesDocumentation/buttons.png?raw=true "Buttons")
The first one shows a grid which is of minor importance for the moment and will be explained in detail when the implementation is thematized. But one thing that should be mentioned is, that the POC is based on a grid to enable matches of mouse movements, because pixel perfect matching wouldnt lead too many overlapping patterns. The second button is the most important for this POC, because it starts the mouse tracking. After activating this button, a user is allowed to move freely across the webpage, while his movements will be analysed. When a user has finished browsing the webpage, the third button needs to be activated, which disables mouse tracking and starts the processing of all interactions/movements a user did. After the first user has finished his UI-Test, the number input at the end of the button-row will appear. It is used to browse through the interactions of all users, which can be shown by pressing the forth button "Show Important Cells".

![interaction 1](./imagesDocumentation/interactions/interaction1.png?raw=true "Interaction 1")

As you can see, there are a couple of coloured cells. These are the cells, which where marked as most important for a user interaction. They represent a heatmap, with the transparency of the color telling you, how often a cell has been visited by this user over his whole browsing process (in this case each cell has been visited the same amount of times). The second thing you see, are blue vectors with different transparencies. They represent the most important mouse movements a user did. Direct movements from one cell to another seem to be most important, which is why they are fully colored. But also indirect movements across multiple cells might be of interest, because they can show overall tendencies. The transparency therefore shows how indirect a movement has been / across how many sequential cells it has been tracked. As an example: The first cell on the top is directly connected to the one bottom right, which is connected to the left bottom cell, which in turn is connected to the one top left. This shows the direct movement of the mouse. But the first cell is also connected to the one bottom left and top left, with steadily reduced transparency, because a movement, that started on the top right, ended on the top left. This connection might also be of interest and shouldnt be overlooked, but also might not be as important as a direct connection. It has to be noted, that a cell in this example is only connected to a fixed number of it followers (determined by a Fan Out Factor), which will be described further in the implementation section.

It already is interesting how a single person moves through a website, but identifying common patterns within several uses (by different users) is even more interesting. The following images show two more interactions and espacially the second one is a little more complex.

![interaction 2](./imagesDocumentation/interactions/interaction2.png?raw=true "Interaction 2")

![interaction 3](./imagesDocumentation/interactions/interaction3.png?raw=true "Interaction 3")

Now to identify common patterns, the last button can be pressed ("Show Patterns"), resulting in an overlay as seen in the following image.

![patterns](./imagesDocumentation/interactions/pattern/patternGrid.png?raw=true "Patterns")

As you can see, the same visual components are visible as in the overlay of single interactions, even though their sizes, colors and meanings changed a bit. The heatmap in the background now show the most important cells across all captured interactions (now the transparency differences are more obvious). And just like the heatmap, the vectors shown are also a combinational representation of movements, that where found in most of the captured interactions, representing the movement patterns. This shows, which movements are most common and this might also be seen as a hint for which elements seem to be most important. The transparency of these vectors represents the combined importance (indirectness) of the same vector in all the different interactions it appeared in. For example: Each interaction started top right and moved to the cell bottom right, which is why this pattern is fully colored. The vector from the second to the third cell (bottom right to bottom left) isnt as strong, because the second and third user interactions had at least one mouse movement to another cell in between (shown by the colored cells that have no vector attached to them). All the vectors, that appear in less than a predefined amount of interactions (in this example the threshhold is 50%), will be removed and wont count as patterns.

This was the main idea that had to be tested. Overall the idea should now be clear. It is a really simple prototype, which can be enhanced quite a lot, but it should show, that the basic concept is working. There are a couple of options that can be adjusted, which will be explained in the next section. The next section will also explain the interrelationships to the Shazam algorithm, while explaining how this POC has been implemented / which ideas it is based on.


### Database <a name="database"></a>
On the "Database" page, a user can start to fill the database with songs, that are later used for recognizing recorded samples. On this page there are two options to choose from.
![database page](./images/database.png?raw=true "Database Page")
The first option is to upload new song files. The uploaded songs will be decoded by the prototype to generate fingerprints (robust hashes used for song recognition), that will be stored in a local object (used as a simple database). Depending on the length of a song and the processing power of the pc, this process might take multiple minutes (like 2 to 4 minutes for each song). Because decoded songs are only saved in a local object, all processed data will be lost on a page reload or server restart. That is why a .json file will be downloaded after all processing is done, which contains the processed data for a song (its name, length and all fingerprints / hashes). On a restart / reload, only these .json files need to be provided by using the second button, removing the need for processing a song again and again. These .json-files contain all information needed for song recognition and are uploaded in an instant (only milliseconds per song-file). If songs or their corresponding .json files were uploaded, this page will show a list of currently present songs, that can be recognized by the prototype. Remember that the name of uploaded files will be used as the song name. (Important files for this page are "src/views/RecordSong.vue" and "src/models/SongDatabase.ts")
![song upload](./images/songs.png?raw=true "Song List")

### Record Sample <a name="record_sample"></a>
When songs have been uploaded, a song recognition can be done. The second page "Record Sample" provides all functionality needed to record a sample (corresponding files are "src/views/RecordSample.vue", "src/models/AudioProcessor.ts" and all components "src/compontents/*.vue").
![sample page](./images/sample.png?raw=true "Sample Page")
First of all a user is allowed to choose the microphone that will be used for recording a sample, by using the dropdown menu. Next he can start a recording of his surrounding sounds, by clicking on the "Start recording" button. A 3 second countdown will start, before the recording itself begins, to allow for last adjustments. The recording itself lasts for 15 seconds and cant be canceled once started. The button will show the remaining time while the recording is active. After 15 seconds, the decoding of the recorded sample will start. The decoding takes a couple of seconds, depending on the processing power available. The text below the button will show the current process / step. When processing is done, a list of up to three possible matches will be displayed, ranked by a matching score. For each song, the song name, its length, its maximum matching score and the time offset of the sample compared to the original song will be displayed.
![found songs](./images/foundSongs.png?raw=true "Found Songs")
<a name="time_domain"></a>
Next all the steps used by the Shazam-Algorithm are visualy displayed. Drawing all of these will take some time, because a lot of data has to be visualized and only simple canvas implementations were used. Simply wait until all of the graphs are updated.
The first canvas that is visible will display the time domain of the recorded sample. The x-axis is representing the time, the y-axis the power of the audio-signal at each corresponding point in time (drawn with "src/components/WaveChart.vue").
![time domain](./images/timeDomain.png?raw=true "Time Domain")
<a name="spectrum"></a>
The next step / canvas presents the corresponding frequency domain / spectrum of the signal, showing all frequencies present in the recorded signal (x-axis), together with their magnitudes (y-axis). For calculating this spectrum, a FFT has been used (see function "calculateSpectrum" in the file "src/models/AudioProcessor.ts"). This step is not needed for the Shazam algorithm itself, but gives a nice impression of the overall sample (drawn with "src/components/FreqChart.vue").
![spectrum](./images/spectrum.png?raw=true "Spectrum")
<a name="spectrogram"></a>
Important for the Shazam algorithm is the calculation of a spectrogram (see function "calculateSpectrogram" in "src/models/AudioProcessor.ts"), where the spectrum is calculated for short time slices with the help of an STFT. The x-axis of this graph is the time, the y-axis the frequency and a heatmap shows the power of each frequency at each timeslice. The darker the color, the stronger the power of a frequency at that time. Here, the y-axis is reduced to the maximum frequency, that had a magnitude above a threshhold, so that not all the empty space above it will be drawn (drawn with "src/components/Spectrogram.vue").
![spectrogram](./images/spectrogram.png?raw=true "Spectrogram")
<a name="constellation"></a>
Next up, the algorithm calculates a constellation map, which contains those points of the spectrogram, that provide the highest power in a short area around it. Wang called these points the spectrogram peaks. In this prototype, these points also have to be above a threshhold, so that no unimportant points in otherwise empty spaces will be created (see function "getConstellationPoints" in "src/models/AudioProcessor.ts"). The resulting graph is called constellation map, because it reminded Wang of a star (constellation) map (drawn with "src/components/ConstellationMap.vue").
![constellation map](./images/constellationMap.png?raw=true "Constellation Map")
<a name="song_matching"></a>
These constellation points are now used for a combinatorial hashing. For that, anchor points are selected and sequentially combined with points in a target zone behind it. The target zones size is determined by a fan out factor, which determins the number of points in such a zone. From these pairs hashes are created (fingerprints), containing the frequency of the anchor point, the frequency of the point from the target zone, and the time difference between these points. For every hash a hash-token object is generated, containing the hash itself and the time offset of the anchor point, which is needed for song matching (see function "calculateHashes" in "src/models/AudioProcessor.ts"). This step has no visualization and was therefore described in a little more detail.

After creating the hashes, they are send to the database, which tries to determine the best match (in this prototype a local file is used as database "src/models/SongDatabase.ts", function "getSongFor"). To do so, firstly all the hashes are compared to the hashes in the database, which simply is a lookup in an hashtable. In this hashtable, the hashes of the songs are saved, together with the song name they belong to. The matches for every song are collected. For every match, a new offset pair is generated, containing the offset from the song hash and the offset of the matching sample hash. After collecting all the matches, the matching factor is calculated for each song. Calculating this factor can be thought of as a two step process, even though in reality only the second one is needed (and used). First of, a scatterplot is created for the matching offset pairs of each song. This is illustrated for the best matching song of a request (drawn with "src/components/OffsetScatterplot.vue").
![offset scatterplot](./images/offsetScatterplot.png?raw=true "Offset Scatterplot")
Each point represents a matching Hash between the sample and the current song. As you can see, there are quite a lot of matches. To determine, if it is a match, you need to look for points building a diagonal in this scatterplot. Here it is obviously around 100 seconds, which means that these are sequential points of the sample, that are also appearing in the original song in the same order and with the same timedifference between them, starting at around 100 seconds in the original. The amount of points in such a diagonal is used as the matching score of a song and the one with the highest score is chosen as match. Because these diagonals arent always as obvious as in this example and because this process needs to be automated, an additional approach to determine these diagonals is used. For each point of this scatterplot, the offset of the sample is subtracted from the original song offset, leaving the relative offset in between. These relative offsets are now used to create a histogram (drawn with "src/components/OffsetHistogram.vue").
![offset histogram](./images/offsetHistogram.png?raw=true "Offset Histogram")
If there is a high peak at one offset, it represents such a diagonal. The amount of this peak then is used as the total score of this song.

### Sinusoids <a name="sinusoids"></a>
To demonstrate the way a DFT works, this page enables a user to create a signal from multiple waves with different frequencies. The sample rate and frequency can be chosen, as well as the type of the wave (sine or cosine) that will be added to the signal (see "src/views/SinusoidDrawer.vue").
![create signal](./images/createWave.png?raw=true "Create Signal")
The current combination of waves will be displayed in the time domain, which demonstrates how signals are joined. Following, a cosine wave with a frequency of 3Hz is drawn, and afterwards enhanced by a 10Hz sine wave.
![cosine wave](./images/cos3Hz.png?raw=true "Cosine Wave")
![sine wave addition](./images/addSine10hz.png?raw=true "Sine wave addition")
The next canvas shows the spectrum / frequency domain of that signal. To calculate this spectrum, a DFT has been implemented (see "src/models/DFT.ts").
![spectrum dft](./images/spectrumDFT.png?raw=true "Spectrum DFT")
Lastly, a user can recreate the DFT manually, by drawing the signal around a circle with different circle frequencies. This is meant to enhance the understanding of the DFT itself (drawn with "src/components/Fourier.vue"). In the following images, three different frequencies are tested: 1Hz, 3Hz and 10Hz. 3Hz and 10Hz are present in the signal, which is shown by a shift of the mass center (circle in the center of the plot).
![test frequency 1hz](./images/test1Hz.png?raw=true "Test Frequency 1Hz")
![test frequency 3hz](./images/test3Hz.png?raw=true "Test Frequency 3Hz")
![test frequency 10hz](./images/test10Hz.png?raw=true "Test Frequency 10Hz")
If the center of mass is shifted horizontally, it represents the frequency of a cosine wave. If it shifts vertically, it represents a sine wave. If a frequency is found within a cosine and sine part, the shift would be on both axis.

## Project setup <a name="project_setup"></a>
```
npm install
```

### Compiles and hot-reloads for development
```
npm run serve
```

### Compiles and minifies for production
```
npm run build
```

### Lints and fixes files
```
npm run lint
```

### Website uses Port 8080 (localhost:8080)

### Customize configuration
See [Configuration Reference](https://cli.vuejs.org/config/).
