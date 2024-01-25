// ==UserScript==
// @name        ExamTopics Answer Tracker
// @namespace   ExamTopicsScript
// @description Enhances the ExamTopics website to allow tracking of answers and scores for practice exams.
// @include     *://*examtopics.com/*
// @include     file:///Users/richard.weston/git/riweston/ExamTopicsQuizMaker/res/combined_page.html
// @version     1
// @grant       none
// ==/UserScript==
(function () {
    'use strict';

    let totalQuestions = 0;
    let correctAnswers = 0;
    let scorePanel;
    let answeredCorrectly = new Set(); // Set to track correctly answered questions

    // Create a control panel for buttons and score
    let controlPanel = document.createElement('div');
    controlPanel.style.position = 'fixed';
    controlPanel.style.top = '10px';
    controlPanel.style.right = '10px';
    controlPanel.style.padding = '10px';
    controlPanel.style.backgroundColor = 'lightgrey';
    controlPanel.style.borderRadius = '5px';
    controlPanel.style.zIndex = '1000';

    // Function to create and display a floating score panel
    function createScorePanel() {
        scorePanel = document.createElement('div');
        scorePanel.style.position = 'fixed';
        scorePanel.style.bottom = '10px';
        scorePanel.style.right = '10px';
        scorePanel.style.padding = '10px';
        scorePanel.style.backgroundColor = 'lightgrey';
        scorePanel.style.border = '1px solid black';
        scorePanel.style.borderRadius = '5px';
        scorePanel.style.zIndex = '1000';
        scorePanel.innerHTML = `Score: ${correctAnswers} / ${totalQuestions}`;
        document.body.appendChild(scorePanel);
    }

    // Function to update the score display
    function updateScoreDisplay() {
        scorePanel.innerHTML = `Score: ${correctAnswers} / ${totalQuestions}`;
    }

    // Function to insert checkboxes and submit button
    function insertCheckboxesAndButtons() {
        let questions = document.querySelectorAll('p.card-text');
        totalQuestions = questions.length / 2;

        questions.forEach(function (question, qIndex) {
            let answers = question.closest('.card-body').querySelectorAll('li.multi-choice-item');

            // Determine the maximum number of selections required for this question
            let correctAnswerString = getCorrectAnswersString(question);
            let maxSelections = correctAnswerString.length;

            answers.forEach(function (answer, aIndex) {
                if (!answer.querySelector('input[type="checkbox"]')) {
                    let checkbox = document.createElement('input');
                    checkbox.setAttribute('type', 'checkbox');
                    checkbox.setAttribute('name', 'answerGroup' + qIndex);
                    checkbox.setAttribute('value', String.fromCharCode(65 + aIndex));
                    checkbox.addEventListener('change', function () {
                        enforceCheckboxLimit(question, maxSelections);
                    });
                    answer.insertBefore(checkbox, answer.firstChild);
                }
            });

            // Check if a submit button already exists, if not create one using the helper function
            let cardBody = question.closest('.card-body');
            if (!cardBody.querySelector('button')) {
                let submitButton = createButton('Submit Answer', function () {
                    calculateScore(question, qIndex);
                    disableQuestion(question);
                });
                submitButton.style.marginTop = '10px';
                cardBody.appendChild(submitButton);
            }
        });
    }

    // Function to set a limit on the number of checkboxes that can be checked
    function enforceCheckboxLimit(question, maxSelections) {
        let checkboxes = Array.from(question.closest('.card-body').querySelectorAll('input[type="checkbox"]'));
        let selectedCount = checkboxes.filter(cb => cb.checked).length;

        checkboxes.forEach(cb => {
            if (!cb.checked) {
                cb.disabled = selectedCount >= maxSelections;
            }
        });
    }

    // Function to disable further changes for a question
    function disableQuestion(question) {
        let checkboxes = question.closest('.card-body').querySelectorAll('input[type="checkbox"]');
        checkboxes.forEach(checkbox => {
            checkbox.disabled = true; // Modified to address linter warning
        });
        let submitButton = question.closest('.card-body').querySelector('button');
        submitButton.disabled = true;
    }

    // Function to override the correct answer if the community answer is different based on a threshold
    function getCommunityPreferredAnswer(question) {
        const voteBars = question.querySelectorAll('.vote-bar.progress-bar');
        let voteData = {};

        voteBars.forEach(bar => {
            const match = bar.textContent.match(/([A-Z])\s*\((\d+)%\)/);
            if (match) {
                const answer = match[1];
                const percentage = parseInt(match[2], 10);
                if (!voteData[answer] || voteData[answer] < percentage) {
                    voteData[answer] = percentage;
                }
            }
        });

        let highestVote = { answer: null, percentage: 0 };
        for (const [answer, percentage] of Object.entries(voteData)) {
            if (percentage > highestVote.percentage) {
                highestVote = { answer, percentage };
            }
        }

        return highestVote;
    }

    // Function to get the correct answers from a question card as a string (WIP)
    function getCorrectAnswersString(question) {
        // Extract the officially stated correct answer
        let correctAnswerElement = question.closest('.card-body').querySelector('.card-text.question-answer.bg-light.white-text');
        let officialAnswer = correctAnswerElement ? correctAnswerElement.textContent.match(/Correct Answer:\s*([A-Z]+)\s/) : null;

        // Extract the community's preferred answer
        let communityAnswer = getCommunityPreferredAnswer(question);

        // Threshold for community preference (e.g., 75%)
        const threshold = 65;
        if (communityAnswer && communityAnswer.percentage >= threshold) {
            return communityAnswer.answer; // Return community answer if it meets the threshold
        }

        return officialAnswer && officialAnswer[1] ? officialAnswer[1] : "";
    }

    // Function to calculate and display the score
    function calculateScore(question, questionIndex) {
        let selectedCheckboxes = Array.from(question.closest('.card-body').querySelectorAll('input[type="checkbox"]:checked'));
        let selectedAnswers = selectedCheckboxes.map(cb => cb.value).sort().join('');

        let correctAnswerString = getCorrectAnswersString(question);

        let cardBody = question.closest('.card-body');

        if (selectedAnswers === correctAnswerString) {
            if (!answeredCorrectly.has(questionIndex)) {
                // Set the background color of the question card to green
                cardBody.closest('.card').style.backgroundColor = 'lightgreen';
                correctAnswers++;
                answeredCorrectly.add(questionIndex);
            }
        } else {
            // Set the background color of the question card to red
            cardBody.closest('.card').style.backgroundColor = 'lightcoral';
            if (answeredCorrectly.has(questionIndex)) {
                correctAnswers--;
                answeredCorrectly.delete(questionIndex);
            }
        }

        updateScoreDisplay();
    }

    // Function to save the session data
    function saveSessionData() {
        let today = new Date().toISOString().split('T')[0]; // Get current date in YYYY-MM-DD format
        let scorePercentage = (correctAnswers / totalQuestions) * 100;

        let sessionData = {
            date: today,
            correctAnswers: correctAnswers,
            totalQuestions: totalQuestions,
            scorePercentage: scorePercentage.toFixed(2)
        };

        // Get existing sessions from local storage or initialize an empty array
        let existingSessions = JSON.parse(localStorage.getItem('examSessions')) || [];
        existingSessions.push(sessionData);
        localStorage.setItem('examSessions', JSON.stringify(existingSessions));
    }

    // Function to display past sessions
    function displayPastSessions() {
        let existingSessions = JSON.parse(localStorage.getItem('examSessions')) || [];
        let message = existingSessions.map(session =>
            `Date: ${session.date}, Score: ${session.correctAnswers}/${session.totalQuestions} (${session.scorePercentage}%)`
        ).join('\n');

        alert('Past Sessions:\n' + message);
    }

    // Function to add 'End Exam' and 'Clear History' buttons
    function addControlButtons() {
        // End Exam Button
        let endExamButton = createButton('End Exam', function () {
            saveSessionData();
            alert('Exam ended, and results saved.');
        });

        // Clear History Button
        let clearHistoryButton = createButton('Clear History', function () {
            localStorage.removeItem('examSessions');
            alert('History cleared.');
        });

        // Display Sessions Button
        let displaySessionsButton = createButton('Display Past Sessions', displayPastSessions);

        controlPanel.appendChild(endExamButton);
        controlPanel.appendChild(clearHistoryButton);
        controlPanel.appendChild(displaySessionsButton);
    }

    // Helper function to create a button
    function createButton(text, onClick) {
        let button = document.createElement('button');
        button.textContent = text;
        button.addEventListener('click', onClick);
        button.style.marginTop = '5px';
        return button;
    }

    // Function to create a random exam
    function addExamControlInputs() {
        let questions = document.querySelectorAll('p.card-text');
        let totalQuestions = questions.length / 2; // Assuming each question has two 'p.card-text' elements

        let inputField = document.createElement('input');
        inputField.type = 'number';
        inputField.placeholder = 'Number of questions';
        inputField.min = 1;
        inputField.max = totalQuestions;
        inputField.style.marginRight = '5px';

        let startButton = createButton('Start Exam', function () {
            createRandomExam(inputField.value);
        });

        controlPanel.appendChild(inputField);
        controlPanel.appendChild(startButton);
    }

    // Function to create a random exam
    function getRandomIndices(num, total) {
        let indices = new Set();
        while (indices.size < num) {
            let randomIndex = Math.floor(Math.random() * total);
            indices.add(randomIndex);
        }
        return Array.from(indices);
    }

    // Function to create a random exam
    function createRandomExam(numQuestions) {
        let questions = document.querySelectorAll('.exam-question-card'); // Selector for the question cards
        numQuestions = Math.min(numQuestions, questions.length); // Ensure the requested number is not more than available

        let selectedIndices = getRandomIndices(numQuestions, questions.length);

        // Update totalQuestions and reset correctAnswers for the new random exam
        totalQuestions = numQuestions;
        correctAnswers = 0; // Reset correct answers if you want the score to start from 0 for each random exam

        questions.forEach((card, index) => {
            if (selectedIndices.includes(index)) {
                card.style.display = ''; // Show selected questions
            } else {
                card.style.display = 'none'; // Hide other questions
            }
        });

        // Update the score display
        updateScoreDisplay();
    }

    // Run the functions
    window.addEventListener('load', function () {
        document.body.appendChild(controlPanel);
        addExamControlInputs();
        insertCheckboxesAndButtons();
        createScorePanel();
        addControlButtons();
    });
})();
